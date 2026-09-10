import type { CSSProperties } from 'react';
import type { Card } from '../game/types';
import { cardLabel, isRedSuit, SUIT_SYMBOLS } from '../game/display';
import { RANK_LABELS } from '../game/askQuestions';
import { Avatar } from './Avatar';

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
    return <div style={base} aria-label="Carta oculta" />;
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
      <span style={{ color: suitColor }}>{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}

export type { CardSlotState };
