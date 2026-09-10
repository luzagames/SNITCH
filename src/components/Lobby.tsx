import { useEffect, useState } from 'react';
import { subscribeToPlayers, subscribeToRoomStatus } from '../firebase/rooms';
import type { RoomPlayer } from '../firebase/rooms';
import { dealAndStartGame } from '../firebase/gameSync';

export function Lobby({
  roomCode,
  uid,
  onGameStarted,
}: {
  roomCode: string;
  uid: string;
  onGameStarted: () => void;
}) {
  const [players, setPlayers] = useState<RoomPlayer[]>([]);

  useEffect(() => {
    const unsubPlayers = subscribeToPlayers(roomCode, setPlayers);
    const unsubStatus = subscribeToRoomStatus(roomCode, (status) => {
      if (status === 'playing') onGameStarted();
    });
    return () => {
      unsubPlayers();
      unsubStatus();
    };
  }, [roomCode, onGameStarted]);

  const isHost = players.find((p) => p.id === uid)?.isHost ?? false;
  const canStart = isHost && players.length >= 2;

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

      <p style={{ fontSize: 18, color: 'var(--snitch-muted)', marginTop: 32, marginBottom: 8 }}>JUGADORES</p>
      <ul style={{ listStyle: 'none', padding: 0, fontSize: 22 }}>
        {players.map((p) => (
          <li key={p.id}>
            {p.name}
            {p.isHost ? ' (host)' : ''}
          </li>
        ))}
      </ul>

      {isHost ? (
        <button
          className="snitch-btn-accent"
          disabled={!canStart}
          onClick={() => dealAndStartGame(roomCode, players.map((p) => ({ id: p.id, name: p.name })))}
          style={{ marginTop: 24 }}
        >
          EMPEZAR PARTIDA
        </button>
      ) : (
        <p style={{ marginTop: 24, color: 'var(--snitch-muted)' }}>Esperando a que el host arranque...</p>
      )}

      {isHost && !canStart && (
        <p style={{ fontSize: 14, color: 'var(--snitch-muted)', marginTop: 8 }}>
          Necesitás al menos 2 jugadores para empezar.
        </p>
      )}
    </div>
  );
}
