import { useEffect, useRef, useState } from 'react';
import { subscribeToGameState, subscribeToOwnHand, submitAction, startHostReferee, announcePlayerLeft } from '../firebase/gameSync';
import type { SyncedGameState } from '../firebase/gameSync';
import { subscribeToRoom, resetRoomToLobby, leaveRoom, HOST_STALE_THRESHOLD_MS } from '../firebase/rooms';
import { useHostPresence } from '../hooks/useHostPresence';
import { isHostStale } from '../hooks/hostPresenceLogic';
import { recordMatchStats } from '../firebase/profile';
import { createStatsAccumulator } from '../firebase/gameSyncLogic';
import { AchievementToast, useAchievementToastQueue } from './AchievementToast';
import { VictoryCard } from './VictoryCard';
import { captureAndShareImage } from '../utils/shareImage';
import { Table } from './Table';
import { KillPicker } from './KillPicker';
import { AskPicker } from './AskPicker';
import { CardSlot } from './CardSlot';
import { LoadingScreen } from './LoadingScreen';
import type { PlayerSeatData } from './PlayerSeat';
import type { AskQuestion, Card } from '../game/types';
import '../styles/theme.css';

type PanelState = 'closed' | 'kill' | 'ask';
const REVEAL_DURATION_MS = 1000;

export function MultiplayerGameScreen({
  roomCode,
  uid,
  isAnonymous,
  onExit,
  onReturnToLobby,
}: {
  roomCode: string;
  uid: string;
  isAnonymous: boolean;
  onExit: () => void;
  onReturnToLobby: () => void;
}) {
  const { hostId, isHost, players, kicked } = useHostPresence(roomCode, uid);
  const [gs, setGs] = useState<SyncedGameState | null>(null);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [panel, setPanel] = useState<PanelState>('closed');
  const [spectating, setSpectating] = useState(false);
  const [flashCard, setFlashCard] = useState<Card | null>(null);
  const lastRevealSeen = useRef<number | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAchievementEventSeen = useRef<number | null>(null);
  const statsRecorded = useRef(false);
  const { current: currentToast, pushAchievements } = useAchievementToastQueue();
  const [shareWinFeedback, setShareWinFeedback] = useState<string | null>(null);
  const [sharingImage, setSharingImage] = useState(false);
  const victoryCardRef = useRef<HTMLDivElement>(null);
  const previousKnownHostId = useRef<string | null>(null);
  const [becameHostNotice, setBecameHostNotice] = useState(false);

  // Avisamos SOLO cuando ya sabíamos con certeza que el host era OTRA
  // persona (previousKnownHostId tenía un valor real, no null) y después
  // pasa a ser uid — eso sí es una toma de posta real. Si arrancamos
  // siendo host desde el vamos, hostId pasa directo de null (todavía no
  // sabemos nada) a uid, sin pasar por "sabíamos que era otro" — por eso
  // NO alcanza con mirar si isHost pasó de false a true: ese salto inicial
  // de null a uid también cuenta como "false a true" y disparaba el
  // cartel de forma incorrecta apenas arrancaba la partida.
  useEffect(() => {
    if (previousKnownHostId.current !== null && previousKnownHostId.current !== uid && hostId === uid) {
      setBecameHostNotice(true);
      setTimeout(() => setBecameHostNotice(false), 5000);
    }
    if (hostId !== null) previousKnownHostId.current = hostId;
  }, [hostId, uid]);

  async function handleShareWin() {
    if (!victoryCardRef.current || sharingImage) return;
    setSharingImage(true);
    setShareWinFeedback(null);
    try {
      const result = await captureAndShareImage(
        victoryCardRef.current,
        'snitch-victoria.png',
        '¡Gané una partida de SNITCH! 🏆🕵️'
      );
      if (result === 'downloaded') setShareWinFeedback('¡Imagen descargada!');
    } catch {
      setShareWinFeedback('No se pudo generar la imagen.');
    } finally {
      setSharingImage(false);
      setTimeout(() => setShareWinFeedback(null), 2500);
    }
  }

  useEffect(() => {
    const unsubGs = subscribeToGameState(roomCode, setGs);
    const unsubHand = subscribeToOwnHand(roomCode, uid, setMyHand);
    const unsubReferee = isHost ? startHostReferee(roomCode) : undefined;
    // Si el host toca "JUGAR DE NUEVO", la sala vuelve a 'lobby' — acá lo
    // detectamos para que TODOS (no solo quien tocó el botón) vuelvan al
    // lobby juntos, no solo el host.
    const unsubRoomStatus = subscribeToRoom(roomCode, (info) => {
      if (info.status === 'lobby') onReturnToLobby();
    });
    return () => {
      unsubGs();
      unsubHand();
      unsubReferee?.();
      unsubRoomStatus();
    };
  }, [roomCode, uid, isHost, onReturnToLobby]);

  // Si le toca el turno a alguien que está desconectado (se fue de la
  // sala, o cerró la app sin avisar), el juego se trabaría esperando su
  // jugada para siempre. El host vigila esto y le pasa el turno
  // automáticamente — así el botón de "abandonar mientras jugás" no deja
  // colgado al resto de la mesa.
  useEffect(() => {
    if (!isHost || !gs || gs.status !== 'playing' || gs.pendingAction) return;

    const interval = setInterval(() => {
      const currentPlayerId = gs.turnOrder[gs.currentTurnIndex];
      if (currentPlayerId === uid) return; // nunca nos auto-pasamos a nosotros mismos por esto
      const player = players.find((p) => p.id === currentPlayerId);
      if (isHostStale(player?.lastSeen, Date.now(), HOST_STALE_THRESHOLD_MS)) {
        submitAction(roomCode, { type: 'pass', actorId: currentPlayerId }).catch(() => {});
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isHost, gs, players, roomCode, uid]);

  // Cuando aparece un revealedCard NUEVO (distinto al último que ya vimos),
  // lo mostramos como un flash arriba de la mesa durante 1 segundo. Se
  // controla enteramente en el cliente: no depende de que Firestore lo
  // borre, cada navegador decide solo cuándo esconderlo.
  //
  // OJO — bug real que costó encontrar: Firestore a veces emite la MISMA
  // actualización más de una vez (una versión preliminar y después la
  // confirmada). Cada emisión trae un objeto NUEVO, así que este efecto se
  // vuelve a ejecutar aunque el valor sea lógicamente el mismo. Si el
  // temporizador se devolviera como función de limpieza del efecto (el
  // patrón "normal" de React), esa segunda ejecución CANCELARÍA el
  // temporizador ya armado, y como el chequeo de abajo corta antes de
  // armar uno nuevo (para no re-mostrar el mismo evento), la carta se
  // quedaba pegada en pantalla sin ningún reloj corriendo que la fuera a
  // esconder — no era un tema de datos viejos, era esto. Por eso el
  // temporizador vive en un ref aparte, que NO se cancela solo porque el
  // efecto se vuelva a ejecutar.
  useEffect(() => {
    if (!gs?.revealedCard) return;
    if (gs.revealedCard.revealedAt === lastRevealSeen.current) return;

    lastRevealSeen.current = gs.revealedCard.revealedAt;
    setFlashCard(gs.revealedCard.card);

    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      setFlashCard(null);
      flashTimerRef.current = null;
    }, REVEAL_DURATION_MS);
  }, [gs?.revealedCard]);

  // Esta limpieza SÍ es la correcta: solo cancela el temporizador si el
  // componente se desmonta de verdad (por ejemplo, al salir de la
  // partida), no en cada re-render.
  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  // Cuando aparece un liveAchievementEvent NUEVO, y me toca a mí, lo
  // metemos en la cola de popups — esto es lo que permite que se vean EN
  // PLENA PARTIDA, no solo al final (los logros que necesitan ganar la
  // partida van a aparecer recién ahí, porque hasta ese momento son falsos).
  useEffect(() => {
    const event = gs?.liveAchievementEvent;
    if (!event) return;
    if (event.eventAt === lastAchievementEventSeen.current) return;
    lastAchievementEventSeen.current = event.eventAt;

    const mine = event.grants[uid];
    if (mine) pushAchievements(mine);
  }, [gs?.liveAchievementEvent, uid, pushAchievements]);

  // Registrar el resultado (ganó/perdió) una sola vez, y solo si no es
  // anónimo. Cada navegador registra ÚNICAMENTE su propio resultado, nunca
  // el de otro jugador.
  useEffect(() => {
    if (!gs || gs.status !== 'finished' || isAnonymous || statsRecorded.current) return;
    statsRecorded.current = true;
    const myStats = gs.finalStats?.[uid] ?? createStatsAccumulator();
    const myAchievements = gs.finalAchievements?.[uid] ?? [];
    recordMatchStats(uid, gs.winnerId === uid, myStats, myAchievements)
      .then((newlyUnlockedLifetime) => {
        // Los de por vida (rachas, totales) recién se saben acá, después
        // de escribir el perfil — se muestran con el mismo popup.
        pushAchievements(newlyUnlockedLifetime);
      })
      .catch(() => {
        statsRecorded.current = false; // si falló, permitir reintentar en el próximo render
      });
  }, [gs, uid, isAnonymous, pushAchievements]);

  // Nos sacaron de la sala de verdad (desconexión, o el host nos sacó por
  // fantasma) — con las Security Rules puestas, seguir intentando actuar
  // acá solo generaría errores de permiso en silencio. Mejor avisar y
  // sacar a la persona de esta pantalla trabada.
  if (kicked) {
    return (
      <div className="snitch-root" style={{ padding: 'clamp(16px, 6vw, 40px)', textAlign: 'center' }}>
        <p style={{ fontSize: 'clamp(18px, 5vw, 24px)' }}>Te desconectaste de la sala.</p>
        <p style={{ fontSize: 14, color: 'var(--snitch-muted)', marginTop: 8 }}>
          Pasó demasiado tiempo sin señal tuya, así que te sacamos de la partida.
        </p>
        <button className="snitch-btn-accent" onClick={onExit} style={{ marginTop: 24 }}>
          VOLVER AL INICIO
        </button>
      </div>
    );
  }

  if (!gs) {
    return <LoadingScreen message="Cargando partida..." />;
  }

  const myTurn = gs.turnOrder[gs.currentTurnIndex] === uid;
  const waitingOnReferee = gs.pendingAction !== null;
  const actorName = gs.playersPublic[gs.turnOrder[gs.currentTurnIndex]]?.name ?? '';
  const iAmEliminated = gs.playersPublic[uid] ? !gs.playersPublic[uid].alive : false;

  async function handleLeaveGame() {
    const myName = gs!.playersPublic[uid]?.name ?? 'Alguien';
    await announcePlayerLeft(roomCode, myName).catch(() => {});
    await leaveRoom(roomCode, uid).catch(() => {});
    onExit();
  }

  // El botón "SALIR" de la pantalla final (GANADOR) es un caso aparte del
  // de "SALIR DE LA PARTIDA" — pero necesita la misma limpieza: sacar al
  // jugador de la lista real de la sala, para que un "Jugar de nuevo"
  // posterior no lo arrastre como fantasma.
  async function handleExitAfterMatch() {
    await leaveRoom(roomCode, uid).catch(() => {});
    onExit();
  }

  if (gs.status === 'finished') {
    const winnerName = gs.winnerId ? gs.playersPublic[gs.winnerId]?.name : '???';
    const iWon = gs.winnerId === uid;
    return (
      <div className="snitch-root" style={{ padding: 'clamp(16px, 6vw, 40px)', textAlign: 'center' }}>
        {currentToast && <AchievementToast achievementId={currentToast} />}
        {iWon && (
          <VictoryCard
            ref={victoryCardRef}
            winnerName={winnerName ?? '???'}
            hand={myHand}
            opponentNames={gs.turnOrder.filter((id) => id !== gs.winnerId).map((id) => gs.playersPublic[id]?.name ?? '')}
          />
        )}
        <p style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 'clamp(20px, 6vw, 28px)' }}>GANADOR</p>
        <p style={{ fontSize: 'clamp(24px, 8vw, 32px)', margin: '16px 0', wordBreak: 'break-word' }}>{winnerName}</p>
        <p style={{ fontSize: 'clamp(16px, 4vw, 20px)', color: 'var(--snitch-muted)' }}>ÚLTIMO EN PIE</p>
        {iWon && (
          <div>
            <button onClick={handleShareWin} disabled={sharingImage} style={{ marginTop: 16, fontSize: 14 }}>
              {sharingImage ? 'Generando imagen...' : 'COMPARTIR VICTORIA 🏆'}
            </button>
            {shareWinFeedback && (
              <p style={{ fontSize: 13, color: 'var(--snitch-muted)', marginTop: 4 }}>{shareWinFeedback}</p>
            )}
          </div>
        )}
        {isHost ? (
          <button
            className="snitch-btn-accent"
            onClick={() => resetRoomToLobby(roomCode)}
            style={{ marginTop: 24, display: 'block', marginInline: 'auto' }}
          >
            JUGAR DE NUEVO
          </button>
        ) : (
          <p style={{ fontSize: 14, color: 'var(--snitch-muted)', marginTop: 24 }}>
            Si querés otra ronda, esperá a que el host toque "Jugar de nuevo".
          </p>
        )}
        <button className="snitch-btn-accent" onClick={handleExitAfterMatch} style={{ marginTop: 12 }}>
          SALIR
        </button>
      </div>
    );
  }

  // Jugador eliminado que todavía no eligió qué hacer: mostrar la elección
  // antes de dejarlo ver el resto de la mesa como espectador.
  if (iAmEliminated && !spectating) {
    return (
      <div className="snitch-root" style={{ padding: 'clamp(16px, 6vw, 40px)', textAlign: 'center' }}>
        {currentToast && <AchievementToast achievementId={currentToast} />}
        <p style={{ fontSize: 'clamp(18px, 5vw, 24px)' }}>Fuiste eliminado.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 280, margin: '24px auto' }}>
          <button className="snitch-btn-accent" onClick={() => setSpectating(true)}>
            OBSERVAR
          </button>
          <button onClick={handleLeaveGame}>SALIR DE LA PARTIDA</button>
        </div>
      </div>
    );
  }

  const seatData: PlayerSeatData[] = gs.turnOrder.map((playerId) => {
    const pub = gs.playersPublic[playerId];
    const isYou = playerId === uid;
    const roomPlayer = players.find((p) => p.id === playerId);
    return {
      id: playerId,
      name: pub.name,
      alive: pub.alive,
      // Vos mismo nunca te ves "desconectado" a vos mismo, obvio. Para el
      // resto, comparamos el último latido que tenemos contra el mismo
      // umbral que usa el sistema de toma de posta.
      connected: isYou || !isHostStale(roomPlayer?.lastSeen, Date.now(), HOST_STALE_THRESHOLD_MS),
      lives: pub.lives,
      isYou,
      isCurrentTurn: playerId === gs.turnOrder[gs.currentTurnIndex],
      cardStates: isYou
        ? myHand.map((card) => ({ kind: 'faceup' as const, card }))
        : Array.from({ length: pub.handCount }, () => ({ kind: 'hidden' as const })),
    };
  });

  function handleKill(card: Card) {
    submitAction(roomCode, { type: 'kill', actorId: uid, card });
    setPanel('closed');
  }

  function handleAsk(question: AskQuestion) {
    submitAction(roomCode, { type: 'ask', actorId: uid, question });
    setPanel('closed');
  }

  function handlePass() {
    submitAction(roomCode, { type: 'pass', actorId: uid });
  }

  return (
    <div className="snitch-root" style={{ padding: 'clamp(12px, 4vw, 24px)' }}>
      {currentToast && <AchievementToast achievementId={currentToast} />}
      {!iAmEliminated && (
        <button
          onClick={handleLeaveGame}
          style={{
            position: 'fixed',
            top: 8,
            left: 8,
            zIndex: 40,
            fontSize: 11,
            padding: '4px 8px',
            color: 'var(--snitch-muted)',
            border: '1px solid var(--snitch-muted)',
            background: 'var(--snitch-bg)',
          }}
        >
          ABANDONAR
        </button>
      )}
      {becameHostNotice && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            background: 'var(--snitch-bg)',
            border: '2px solid var(--snitch-accent)',
            padding: '8px 14px',
            fontSize: 14,
            textAlign: 'center',
          }}
        >
          El host anterior se desconectó — ahora sos vos quien maneja la partida.
        </div>
      )}
      {iAmEliminated && spectating && (
        <div
          style={{
            textAlign: 'center',
            marginBottom: 16,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span style={{ color: 'var(--snitch-muted)', fontSize: 16 }}>Modo espectador</span>
          <button onClick={handleLeaveGame}>SALIR DE LA PARTIDA</button>
        </div>
      )}

      <Table players={seatData} flashCard={flashCard} />

      {!iAmEliminated && myHand.length > 0 && (
        <div style={{ textAlign: 'center', margin: '4px 0 12px' }}>
          <p style={{ fontSize: 14, color: 'var(--snitch-muted)', marginBottom: 6 }}>TU MANO</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {myHand.map((card, i) => (
              <CardSlot key={i} state={{ kind: 'faceup', card }} size={56} />
            ))}
          </div>
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: 'clamp(15px, 4vw, 18px)', minHeight: 24, padding: '0 8px' }}>
        {gs.lastMessage}
      </p>

      {gs.lastAnswers && (
        <p style={{ textAlign: 'center', fontSize: 16, color: 'var(--snitch-muted)' }}>
          {gs.lastAnswers.map((a) => `${gs.playersPublic[a.playerId]?.name}${a.matches ? '✓' : '✗'}`).join('  ')}
        </p>
      )}

      {waitingOnReferee && (
        <p style={{ textAlign: 'center', fontSize: 16, color: 'var(--snitch-muted)' }}>Resolviendo...</p>
      )}

      {!waitingOnReferee && panel === 'closed' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          {myTurn ? (
            <>
              <p style={{ fontSize: 20, margin: 0 }}>Tu turno:</p>
              <button className="snitch-btn-accent" onClick={() => setPanel('kill')}>
                KILL
              </button>
              <button className="snitch-btn-accent" onClick={() => setPanel('ask')}>
                PREGUNTAR
              </button>
              <button onClick={handlePass}>PASAR</button>
            </>
          ) : (
            <p style={{ fontSize: 18, color: 'var(--snitch-muted)', textAlign: 'center' }}>Turno de {actorName}...</p>
          )}
        </div>
      )}

      {panel === 'kill' && <KillPicker onPick={handleKill} onCancel={() => setPanel('closed')} />}
      {panel === 'ask' && <AskPicker onSubmit={handleAsk} onCancel={() => setPanel('closed')} />}
    </div>
  );
}
