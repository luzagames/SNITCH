import { Avatar } from './Avatar';
import { Hearts } from './Hearts';
import { CardSlot } from './CardSlot';
import type { CardSlotState } from './CardSlot';
import { RankGemIcon } from './RankGemIcon';
import type { Tier } from '../game/rank';

export interface PlayerSeatData {
  id: string;
  name: string;
  alive: boolean;
  connected: boolean;
  lives: number;
  cardStates: CardSlotState[]; // 3 estados, uno por carta en mano
  isYou: boolean;
  isCurrentTurn: boolean;
  // null para jugadores anónimos (nunca tienen un rating real guardado).
  tier: Tier | null;
}

export function PlayerSeat({ player, featured = false }: { player: PlayerSeatData; featured?: boolean }) {
  const avatarSize = featured ? 140 : 72;
  const nameFontSize = featured ? 28 : 20;
  const gemSize = featured ? 22 : 16;
  const dimmed = !player.alive || !player.connected;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        opacity: dimmed ? 0.6 : 1,
        filter: dimmed ? 'grayscale(1)' : 'none',
      }}
    >
      <div
        style={{
          border: player.isCurrentTurn ? '2px solid var(--snitch-accent)' : '2px solid transparent',
          padding: 4,
          lineHeight: 0,
        }}
      >
        <Avatar alive={player.alive} size={avatarSize} />
      </div>

      {/* El asiento destacado (vos) no muestra su propia fila de cartas acá
          — tu mano ya se ve grande y legible aparte, en "TU MANO". Mostrarla
          also acá era literalmente la misma información dos veces. */}
      {!featured && (
        <div style={{ display: 'flex', gap: 4 }}>
          {player.cardStates.map((state, i) => (
            <CardSlot key={i} state={state} size={34} />
          ))}
        </div>
      )}

      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: nameFontSize }} title={player.tier?.name}>
        {player.tier !== null && <RankGemIcon light={player.tier.light} dark={player.tier.dark} size={gemSize} />}
        {player.name}
        {player.isYou ? ' (vos)' : ''}
      </span>

      {!player.alive ? (
        <span style={{ fontSize: 16, color: 'var(--snitch-muted)' }}>ELIMINADO</span>
      ) : !player.connected ? (
        <span style={{ fontSize: 16, color: 'var(--snitch-muted)' }}>DESCONECTADO</span>
      ) : (
        <Hearts lives={player.lives} />
      )}
    </div>
  );
}
