import { useState } from 'react';
import { isRedSuit, SUIT_SYMBOLS } from '../game/display';
import { RANK_LABELS, SUIT_LABELS } from '../game/askQuestions';
import { Avatar } from './Avatar';
import type { Card, Rank, Suit } from '../game/types';

const SUIT_ORDER: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANK_ORDER: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

const tileBase = {
  background: 'transparent',
  border: '2px solid var(--snitch-fg)',
  borderRadius: 0,
  cursor: 'pointer',
  fontFamily: 'var(--snitch-font-body)',
} as const;

export function KillPicker({ onPick, onCancel }: { onPick: (card: Card) => void; onCancel: () => void }) {
  const [selectedSuit, setSelectedSuit] = useState<Suit | null>(null);

  function pickValue(rank: Rank) {
    if (!selectedSuit) return; // todavía no eligió palo, no hacemos nada
    onPick({ kind: 'standard', suit: selectedSuit, rank });
  }

  return (
    <div
      style={{
        border: '2px solid var(--snitch-fg)',
        padding: 'clamp(10px, 3vw, 18px)',
        width: 'min(520px, 95vw)',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      <p style={{ fontSize: 'clamp(16px, 4.5vw, 18px)', margin: '0 0 8px' }}>1. Elegí el palo:</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {SUIT_ORDER.map((suit) => {
          const isSelected = selectedSuit === suit;
          const color = isRedSuit(suit) ? 'var(--snitch-accent)' : 'var(--snitch-fg)';
          return (
            <button
              key={suit}
              onClick={() => setSelectedSuit(suit)}
              aria-label={SUIT_LABELS[suit]}
              style={{
                ...tileBase,
                borderColor: isSelected ? 'var(--snitch-accent)' : 'var(--snitch-fg)',
                minWidth: 64,
                minHeight: 64,
                fontSize: 32,
                color,
                flex: '1 1 64px',
              }}
            >
              {SUIT_SYMBOLS[suit]}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 'clamp(16px, 4.5vw, 18px)', margin: '0 0 8px' }}>
        2. Elegí el valor{!selectedSuit && ' (primero elegí el palo)'}:
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            opacity: selectedSuit ? 1 : 0.35,
            pointerEvents: selectedSuit ? 'auto' : 'none',
            flex: '1 1 auto',
          }}
        >
          {RANK_ORDER.map((rank) => {
            const color = selectedSuit && isRedSuit(selectedSuit) ? 'var(--snitch-accent)' : 'var(--snitch-bg)';
            return (
              <button
                key={rank}
                onClick={() => pickValue(rank)}
                style={{
                  ...tileBase,
                  background: 'var(--snitch-fg)',
                  borderColor: 'var(--snitch-bg)',
                  minWidth: 42,
                  minHeight: 44,
                  fontSize: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <span style={{ color: 'var(--snitch-bg)' }}>{RANK_LABELS[rank]}</span>
                <span style={{ color }}>{selectedSuit ? SUIT_SYMBOLS[selectedSuit] : ''}</span>
              </button>
            );
          })}
        </div>

        {/* Separador visual, como en la referencia */}
        <div style={{ width: 2, alignSelf: 'stretch', background: 'var(--snitch-muted)' }} />

        {/* Joker en su propio contenedor, SIN el opacity/pointerEvents del
            grupo de números — no necesita palo, así que siempre está
            habilitado y a pleno, y confirma apenas se toca. */}
        <button
          onClick={() => onPick({ kind: 'joker' })}
          style={{
            ...tileBase,
            background: 'var(--snitch-fg)',
            borderColor: 'var(--snitch-accent)',
            minWidth: 50,
            minHeight: 44,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 2,
          }}
          aria-label="Joker"
        >
          <Avatar alive size={26} />
        </button>
      </div>

      <button className="snitch-btn-accent" onClick={onCancel}>
        Cancelar
      </button>
    </div>
  );
}
