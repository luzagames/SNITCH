import { fullCardSet } from '../game/deck';
import { cardLabel } from '../game/display';
import type { Card, Suit } from '../game/types';

const SUIT_ORDER: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export function KillPicker({ onPick, onCancel }: { onPick: (card: Card) => void; onCancel: () => void }) {
  const deck = fullCardSet();

  return (
    <div style={{ border: '2px solid var(--snitch-fg)', padding: 16, maxWidth: 620, margin: '0 auto' }}>
      <p style={{ fontSize: 20, marginTop: 0 }}>Elegí una carta para KILL:</p>
      {SUIT_ORDER.map((suit) => (
        <div key={suit} style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
          {deck
            .filter((c) => c.suit === suit)
            .map((card) => (
              <button
                key={cardLabel(card)}
                onClick={() => onPick(card)}
                style={{ padding: '4px 8px', fontSize: 16, minWidth: 44 }}
              >
                {cardLabel(card)}
              </button>
            ))}
        </div>
      ))}
      <button className="snitch-btn-accent" onClick={onCancel} style={{ marginTop: 8 }}>
        Cancelar
      </button>
    </div>
  );
}
