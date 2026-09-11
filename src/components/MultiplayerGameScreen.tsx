import { useEffect, useRef, useState } from 'react';
import { subscribeToGameState, subscribeToOwnHand, submitAction, startHostReferee } from '../firebase/gameSync';
import type { SyncedGameState } from '../firebase/gameSync';
import { recordMatchStats } from '../firebase/profile';
import { createStatsAccumulator } from '../firebase/gameSyncLogic';
import { AchievementToast, useAchievementToastQueue } from './AchievementToast';
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
  isHost,
  isAnonymous,
  onExit,
}: {
  roomCode: string;
  uid: string;
  isHost: boolean;
  isAnonymous: boolean;
  onExit: () => void;
}) {
  const [gs, setGs] = useState<SyncedGameState | null>(null);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [panel, setPanel] = useState<PanelState>('closed');
  const [spectating, setSpectating] = useState(false);
  const [flashCard, setFlashCard] = useState<Card | null>(null);
  const lastRevealSeen = useRef<number | null>(null);
  const lastAchievementEventSeen = useRef<number | null>(null);
  const statsRecorded = useRef(false);
  const { current: currentToast, pushAchievements } = useAchievementToastQueue();

  useEffect(() => {
    const unsubGs = subscribeToGameState(roomCode, setGs);
    const unsubHand = subscribeToOwnHand(roomCode, uid, setMyHand);
    const unsubReferee = isHost ? startHostReferee(roomCode) : undefined;
    return () => {
      unsubGs();
      unsubHand();
      unsubReferee?.();
    };
  }, [roomCode, uid, isHost]);

  // Cuando aparece un revealedCard NUEVO (distinto al último que ya vimos),
  // lo mostramos como un flash arriba de la mesa durante 1 segundo. Se
  // controla enteramente en el cliente: no depende de que Firestore lo
  // borre, cada navegador decide solo cuándo esconderlo.
  useEffect(() => {
    if (!gs?.revealedCard) return;
    if (gs.revealedCard.revealedAt === lastRevealSeen.current) return;

    lastRevealSeen.current = gs.revealedCard.revealedAt;
    setFlashCard(gs.revealedCard.card);

    const timer = setTimeout(() => setFlashCard(null), REVEAL_DURATION_MS);
    return () => clearTimeout(timer);
  }, [gs?.revealedCard]);

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

  if (!gs) {
    return <LoadingScreen message="Cargando partida..." />;
  }

  const myTurn = gs.turnOrder[gs.currentTurnIndex] === uid;
  const waitingOnReferee = gs.pendingAction !== null;
  const actorName = gs.playersPublic[gs.turnOrder[gs.currentTurnIndex]]?.name ?? '';
  const iAmEliminated = gs.playersPublic[uid] ? !gs.playersPublic[uid].alive : false;

  if (gs.status === 'finished') {
    const winnerName = gs.winnerId ? gs.playersPublic[gs.winnerId]?.name : '???';
    return (
      <div className="snitch-root" style={{ padding: 'clamp(16px, 6vw, 40px)', textAlign: 'center' }}>
        {currentToast && <AchievementToast achievementId={currentToast} />}
        <p style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 'clamp(20px, 6vw, 28px)' }}>GANADOR</p>
        <p style={{ fontSize: 'clamp(24px, 8vw, 32px)', margin: '16px 0', wordBreak: 'break-word' }}>{winnerName}</p>
        <p style={{ fontSize: 'clamp(16px, 4vw, 20px)', color: 'var(--snitch-muted)' }}>ÚLTIMO EN PIE</p>
        <button className="snitch-btn-accent" onClick={onExit} style={{ marginTop: 24 }}>
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
          <button
            onClick={onExit}
            disabled={isHost}
            title={isHost ? 'El host no puede salir mientras la partida siga en curso' : undefined}
          >
            SALIR DE LA PARTIDA
          </button>
          {isHost && (
            <p style={{ fontSize: 14, color: 'var(--snitch-muted)' }}>
              Como sos el host, tenés que quedarte (aunque sea mirando) hasta que termine la partida — tu
              navegador es el que sigue arbitrando las jugadas de los demás.
            </p>
          )}
        </div>
      </div>
    );
  }

  const seatData: PlayerSeatData[] = gs.turnOrder.map((playerId) => {
    const pub = gs.playersPublic[playerId];
    const isYou = playerId === uid;
    return {
      id: playerId,
      name: pub.name,
      alive: pub.alive,
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
          <button
            onClick={onExit}
            disabled={isHost}
            title={isHost ? 'El host no puede salir mientras la partida siga en curso' : undefined}
          >
            SALIR DE LA PARTIDA
          </button>
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
