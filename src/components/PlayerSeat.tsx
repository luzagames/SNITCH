import { Avatar } from './Avatar';
import { Hearts } from './Hearts';
import { CardSlot } from './CardSlot';
import type { CardSlotState } from './CardSlot';

export interface PlayerSeatData {
  id: string;
  name: string;
  alive: boolean;
  lives: number;
  cardStates: CardSlotState[]; // 3 estados, uno por carta en mano
  isYou: boolean;
  isCurrentTurn: boolean;
}

export function PlayerSeat({ player }: { player: PlayerSeatData }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        opacity: player.alive ? 1 : 0.6,
        filter: player.alive ? 'none' : 'grayscale(1)',
      }}
    >
      <div
        style={{
          border: player.isCurrentTurn ? '2px solid var(--snitch-accent)' : '2px solid transparent',
          padding: 4,
          lineHeight: 0,
        }}
      >
        <Avatar alive={player.alive} />
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {player.cardStates.map((state, i) => (
          <CardSlot key={i} state={state} />
        ))}
      </div>

      <span style={{ fontSize: 20 }}>
        {player.name}
        {player.isYou ? ' (vos)' : ''}
      </span>

      {player.alive ? (
        <Hearts lives={player.lives} />
      ) : (
        <span style={{ fontSize: 16, color: 'var(--snitch-muted)' }}>ELIMINADO</span>
      )}
    </div>
  );
}
