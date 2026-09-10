import { fullCardSet } from '../game/deck';
import { cardLabel } from '../game/display';
import type { Card, Suit } from '../game/types';

const SUIT_ORDER: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export function KillPicker({ onPick, onCancel }: { onPick: (card: Card) => void; onCancel: () => void }) {
  const deck = fullCardSet();

  return (
    <div style={{ border: '2px solid var(--snitch-fg)', padding: 'clamp(8px, 3vw, 16px)', width: 'min(620px, 95vw)', margin: '0 auto', boxSizing: 'border-box' }}>
      <p style={{ fontSize: 20, marginTop: 0 }}>Elegí una carta para KILL:</p>
      {SUIT_ORDER.map((suit) => (
        <div key={suit} style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
          {deck
            .filter((c) => c.suit === suit)
            .map((card) => (
              <button
                key={cardLabel(card)}
                onClick={() => onPick(card)}
                style={{ padding: '4px 6px', fontSize: 15, minWidth: 38 }}
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
