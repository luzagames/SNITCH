import { fullCardSet } from '../game/deck';
import { cardLabel, isRedSuit, SUIT_SYMBOLS } from '../game/display';
import { RANK_LABELS, SUIT_LABELS } from '../game/askQuestions';
import type { Card, Suit } from '../game/types';

const SUIT_ORDER: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export function KillPicker({ onPick, onCancel }: { onPick: (card: Card) => void; onCancel: () => void }) {
  const deck = fullCardSet();

  return (
    <div
      style={{
        border: '2px solid var(--snitch-fg)',
        padding: 'clamp(8px, 3vw, 16px)',
        width: 'min(620px, 95vw)',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      <p style={{ fontSize: 20, marginTop: 0 }}>Elegí una carta para KILL:</p>
      {SUIT_ORDER.map((suit, suitIndex) => {
        const color = isRedSuit(suit) ? 'var(--snitch-accent)' : 'var(--snitch-bg)';
        return (
          <div
            key={suit}
            style={{
              marginBottom: 14,
              paddingTop: suitIndex > 0 ? 10 : 0,
              borderTop: suitIndex > 0 ? '1px solid var(--snitch-muted)' : undefined,
            }}
          >
            <p
              style={{
                fontSize: 15,
                color: 'var(--snitch-muted)',
                margin: '0 0 6px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ color }}>{SUIT_SYMBOLS[suit]}</span>
              {SUIT_LABELS[suit]}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {deck
                .filter((c) => c.suit === suit)
                .map((card) => (
                  <button
                    key={cardLabel(card)}
                    onClick={() => onPick(card)}
                    style={{
                      background: 'var(--snitch-fg)',
                      border: '2px solid var(--snitch-bg)',
                      borderRadius: 0,
                      padding: '7px 6px',
                      minWidth: 42,
                      minHeight: 38,
                      fontFamily: 'var(--snitch-font-body)',
                      fontSize: 16,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ color: 'var(--snitch-bg)' }}>{RANK_LABELS[card.rank]}</span>
                    <span style={{ color }}>{SUIT_SYMBOLS[card.suit]}</span>
                  </button>
                ))}
            </div>
          </div>
        );
      })}
      <button className="snitch-btn-accent" onClick={onCancel} style={{ marginTop: 8 }}>
        Cancelar
      </button>
    </div>
  );
}
