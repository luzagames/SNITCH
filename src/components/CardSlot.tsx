import type { CSSProperties } from 'react';
import type { Card } from '../game/types';
import { cardLabel, isRedSuit } from '../game/display';
import { RANK_LABELS } from '../game/askQuestions';
import { Avatar } from './Avatar';
import { SuitIcon } from './SuitIcon';

type CardSlotState =
  | { kind: 'hidden' } // boca abajo, de otro jugador
  | { kind: 'gone' } // descartada por KILL, se muestra tachada
  | { kind: 'faceup'; card: Card }; // tu propia carta

export function CardSlot({ state, size = 34 }: { state: CardSlotState; size?: number }) {
  const base: CSSProperties = {
    width: size,
    height: size * (48 / 34),
    border: '2px solid var(--snitch-fg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--snitch-font-body)',
    fontSize: Math.round(size * (18 / 34)),
    flexShrink: 0,
  };

  if (state.kind === 'hidden') {
    return (
      <div style={base} aria-label="Carta oculta">
        <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="1" y="0" width="3" height="1" fill="var(--snitch-muted)" />
          <rect x="0" y="1" width="1" height="3" fill="var(--snitch-muted)" />
          <rect x="4" y="1" width="1" height="3" fill="var(--snitch-muted)" />
          <rect x="1" y="4" width="3" height="1" fill="var(--snitch-muted)" />
          <rect x="4" y="5" width="2" height="1" fill="var(--snitch-muted)" />
          <rect x="5" y="6" width="2" height="1" fill="var(--snitch-muted)" />
          <rect x="6" y="7" width="2" height="1" fill="var(--snitch-muted)" />
        </svg>
      </div>
    );
  }

  if (state.kind === 'gone') {
    return (
      <div style={{ ...base, borderColor: 'var(--snitch-muted)', color: 'var(--snitch-accent)' }} aria-label="Carta descartada">
        ✕
      </div>
    );
  }

  // Boca arriba: estilo de naipe real — fondo blanco, número en tinta
  // oscura, palo rojo (corazones/diamantes) o negro (picas/tréboles),
  // igual que una baraja física, para distinguirlas de un vistazo.
  const { card } = state;

  if (card.kind === 'joker') {
    return (
      <div
        style={{ ...base, background: 'var(--snitch-fg)', borderColor: 'var(--snitch-accent)' }}
        aria-label="Carta Joker"
      >
        <Avatar alive size={size * 0.75} />
      </div>
    );
  }

  const suitColor = isRedSuit(card.suit) ? 'var(--snitch-accent)' : 'var(--snitch-bg)';

  return (
    <div
      style={{
        ...base,
        background: 'var(--snitch-fg)',
        borderColor: 'var(--snitch-bg)',
        gap: 1,
      }}
      aria-label={`Carta ${cardLabel(card)}`}
    >
      <span style={{ color: 'var(--snitch-bg)' }}>{RANK_LABELS[card.rank]}</span>
      <SuitIcon suit={card.suit} color={suitColor} size={Math.round(size * (14 / 34))} />
    </div>
  );
}

export type { CardSlotState };
