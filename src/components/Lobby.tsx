import { useEffect, useState } from 'react';
import { subscribeToRoom, shareInviteLink, leaveRoom } from '../firebase/rooms';
import { useHostPresence } from '../hooks/useHostPresence';
import { dealAndStartGame } from '../firebase/gameSync';
import { getProfile } from '../firebase/profile';
import { DEFAULT_SKILL } from '../game/rank';

export function Lobby({
  roomCode,
  uid,
  onGameStarted,
  onExit,
}: {
  roomCode: string;
  uid: string;
  onGameStarted: () => void;
  onExit: () => void;
}) {
  const { hostId, isHost, players, kicked } = useHostPresence(roomCode, uid);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  async function handleShare() {
    const me = players.find((p) => p.id === uid);
    const result = await shareInviteLink(roomCode, me?.name ?? 'un amigo');
    setShareFeedback(result === 'copied' ? '¡Link copiado!' : null);
    if (result === 'copied') {
      setTimeout(() => setShareFeedback(null), 2500);
    }
  }

  async function handleLeaveLobby() {
    await leaveRoom(roomCode, uid).catch(() => {});
    onExit();
  }

  // Antes de repartir, buscamos el rating OpenSkill REAL de cada jugador
  // no-anónimo (los anónimos no tienen perfil, así que usan el rating
  // inicial como relleno neutro solo para el cálculo de los DEMÁS — a
  // ellos mismos igual nunca se les guarda ningún cambio ni se les
  // muestra el distintivo, ver PlayerSeat.tsx).
  async function handleStartGame() {
    setStarting(true);
    try {
      const playersWithSkill = await Promise.all(
        players.map(async (p) => {
          if (p.isAnonymous) return { id: p.id, name: p.name, isAnonymous: p.isAnonymous, skill: DEFAULT_SKILL };
          const profile = await getProfile(p.id).catch(() => null);
          const skill = profile ? { mu: profile.mu, sigma: profile.sigma } : DEFAULT_SKILL;
          return { id: p.id, name: p.name, isAnonymous: p.isAnonymous, skill };
        })
      );
      await dealAndStartGame(roomCode, playersWithSkill);
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    const unsubRoom = subscribeToRoom(roomCode, (info) => {
      if (info.status === 'playing') onGameStarted();
    });
    return () => unsubRoom();
  }, [roomCode, onGameStarted]);

  const canStart = isHost && players.length >= 2;

  if (kicked) {
    return (
      <div className="snitch-root" style={{ padding: 'clamp(16px, 6vw, 40px)', textAlign: 'center' }}>
        <p style={{ fontSize: 'clamp(18px, 5vw, 24px)' }}>Te desconectaste de la sala.</p>
        <p style={{ fontSize: 14, color: 'var(--snitch-muted)', marginTop: 8 }}>
          Pasó demasiado tiempo sin señal tuya, así que te sacamos del lobby.
        </p>
        <button className="snitch-btn-accent" onClick={onExit} style={{ marginTop: 24 }}>
          VOLVER AL INICIO
        </button>
      </div>
    );
  }

  return (
    <div className="snitch-root" style={{ padding: 'clamp(16px, 6vw, 40px)', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 'clamp(24px, 7vw, 32px)' }}>SNITCH</h1>

      <p style={{ fontSize: 18, color: 'var(--snitch-muted)', marginBottom: 4 }}>CÓDIGO DE SALA</p>
      <p
        style={{
          fontFamily: 'var(--snitch-font-display)',
          fontSize: 'clamp(24px, 9vw, 36px)',
          letterSpacing: 'clamp(2px, 2vw, 8px)',
          color: 'var(--snitch-accent)',
          wordBreak: 'break-all',
        }}
      >
        {roomCode}
      </p>

      <button onClick={handleShare} style={{ fontSize: 14, marginTop: 4 }}>
        COMPARTIR SALA
      </button>
      {shareFeedback && <p style={{ fontSize: 13, color: 'var(--snitch-muted)', marginTop: 4 }}>{shareFeedback}</p>}

      <p style={{ fontSize: 18, color: 'var(--snitch-muted)', marginTop: 32, marginBottom: 8 }}>JUGADORES</p>
      <ul style={{ listStyle: 'none', padding: 0, fontSize: 22 }}>
        {players.map((p) => (
          <li key={p.id}>
            {p.name}
            {p.id === hostId ? ' (host)' : ''}
            {p.id === uid ? ' (vos)' : ''}
          </li>
        ))}
      </ul>

      {isHost ? (
        <button
          className="snitch-btn-accent"
          disabled={!canStart || starting}
          onClick={handleStartGame}
          style={{ marginTop: 24 }}
        >
          {starting ? 'Repartiendo...' : 'EMPEZAR PARTIDA'}
        </button>
      ) : (
        <p style={{ marginTop: 24, color: 'var(--snitch-muted)' }}>Esperando a que el host arranque...</p>
      )}

      {isHost && !canStart && (
        <p style={{ fontSize: 14, color: 'var(--snitch-muted)', marginTop: 8 }}>
          Necesitás al menos 2 jugadores para empezar.
        </p>
      )}

      <button onClick={handleLeaveLobby} style={{ marginTop: 24, fontSize: 13, color: 'var(--snitch-muted)' }}>
        SALIR DEL LOBBY
      </button>
    </div>
  );
}
