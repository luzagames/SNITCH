import type { CSSProperties } from 'react';
import { Avatar } from './Avatar';
import { Hearts } from './Hearts';
import { CardSlot } from './CardSlot';
import type { CardSlotState } from './CardSlot';
import { RankGemIcon } from './RankGemIcon';
import type { Tier } from '../game/rank';

// Hash bien simple y determinístico — solo para sacar un número estable
// a partir del id de cada jugador (no necesita ser criptográficamente
// nada, es puro "desfase visual").
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

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
  // Los colores del skin que ESE jugador tenía elegido al arrancar la
  // partida — así cada uno se ve en la mesa con su propio estilo, sin
  // importar el skin que tengas vos aplicado en tu pantalla.
  palette: { stroke: string; fill: string };
  // El globito de chat que está mostrando ahora mismo (o null si no tiene
  // ninguno activo). activeEmoteKey cambia con cada mensaje nuevo, para
  // que la animación de entrada se dispare de nuevo aunque el mismo
  // jugador mande la misma frase dos veces seguidas.
  activeEmoteText: string | null;
  activeEmoteKey: number | null;
  // La cabeza coleccionable que ese jugador tenía puesta al arrancar la
  // partida — 'original' si nunca eligió otra.
  headId: string;
}

export function PlayerSeat({ player, featured = false }: { player: PlayerSeatData; featured?: boolean }) {
  const avatarSize = featured ? 140 : 72;
  const nameFontSize = featured ? 28 : 20;
  const gemSize = featured ? 22 : 16;
  const dimmed = !player.alive || !player.connected;

  const showTurnGlow = player.isCurrentTurn && player.connected;
  const showIdleBreathe = !showTurnGlow && player.alive && player.connected;
  // Le pasamos el acento de ESTE jugador como variable CSS, para que la
  // animación de pulso (definida en theme.css) lo use en vez del acento
  // del skin activo en tu propia pantalla.
  const seatStyle = { '--seat-accent': player.palette.stroke } as CSSProperties;
  // Un desfase distinto por jugador (a partir de su id), para que no
  // "respiren" todos exactamente sincronizados — se ve más orgánico.
  const idleDelay = (hashString(player.id) % 20) / 10; // 0 a 1.9s

  return (
    <div
      className="snitch-seat-dim-transition"
      style={{
        ...seatStyle,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        opacity: dimmed ? 0.6 : 1,
        filter: dimmed ? 'grayscale(1)' : 'none',
      }}
    >
      <div
        className={showIdleBreathe ? 'snitch-idle-breathe' : undefined}
        style={{ padding: 4, lineHeight: 0, animationDelay: showIdleBreathe ? `${idleDelay}s` : undefined, position: 'relative' }}
      >
        {player.activeEmoteText !== null && (
          <div key={player.activeEmoteKey} className="snitch-emote-bubble">
            {player.activeEmoteText}
          </div>
        )}
        <Avatar
          alive={player.alive}
          size={avatarSize}
          palette={player.palette}
          headId={player.headId}
          className={showTurnGlow ? 'snitch-turn-pulse' : undefined}
        />
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
