import { useState } from 'react';
import { createGame, currentPlayer } from '../game/rules';
import { Table } from './Table';
import type { PlayerSeatData } from './PlayerSeat';
import '../styles/theme.css';

const NAMES = ['Lolo', 'Juan', 'Martin', 'Pedro', 'Sofia', 'Vale'];

export function TableDemo() {
  const [count, setCount] = useState(6);

  const players = NAMES.slice(0, count).map((name, i) => ({ id: `p${i + 1}`, name }));
  const state = createGame(players);
  const you = state.players[0];
  const current = currentPlayer(state);

  const seatData: PlayerSeatData[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    alive: p.alive,
    connected: true,
    lives: p.lives,
    isYou: p.id === you.id,
    isCurrentTurn: p.id === current.id,
    cardStates:
      p.id === you.id
        ? p.hand.map((card) => ({ kind: 'faceup' as const, card }))
        : p.hand.map(() => ({ kind: 'hidden' as const })),
  }));

  return (
    <div className="snitch-root" style={{ padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <label style={{ fontSize: 20 }}>
          Cantidad de jugadores:{' '}
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Table players={seatData} />
    </div>
  );
}
