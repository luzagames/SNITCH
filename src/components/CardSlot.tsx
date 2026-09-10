import type { CSSProperties } from 'react';
import type { Card } from '../game/types';
import { cardLabel } from '../game/display';

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

  return (
    <div style={base} aria-label={`Carta ${cardLabel(state.card)}`}>
      {cardLabel(state.card)}
    </div>
  );
}

export type { CardSlotState };
