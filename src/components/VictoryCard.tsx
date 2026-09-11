import { forwardRef } from 'react';
import { Avatar } from './Avatar';
import { cardLabel, isRedSuit, SUIT_SYMBOLS } from '../game/display';
import { RANK_LABELS } from '../game/askQuestions';
import type { Card } from '../game/types';

// Cara de una carta, en el mismo estilo de naipe real que el resto de la
// app, pero como divs estáticos (esta tarjeta nunca es interactiva, solo
// se "fotografía").
function CardFace({ card }: { card: Card }) {
  const base = {
    width: 96,
    height: 136,
    border: '3px solid #0a0a0a',
    background: '#f5f5f0',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'VT323', monospace",
    fontSize: 44,
  };

  if (card.kind === 'joker') {
    return (
      <div style={{ ...base, borderColor: '#e8291c' }}>
        <Avatar alive size={72} />
      </div>
    );
  }

  const color = isRedSuit(card.suit) ? '#e8291c' : '#0a0a0a';
  return (
    <div style={base} aria-label={cardLabel(card)}>
      <span style={{ color: '#0a0a0a' }}>{RANK_LABELS[card.rank]}</span>
      <span style={{ color }}>{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}

export const VictoryCard = forwardRef<
  HTMLDivElement,
  { winnerName: string; hand: Card[]; opponentNames: string[] }
>(function VictoryCard({ winnerName, hand, opponentNames }, ref) {
  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: -20000,
        left: -20000,
        width: 1080,
        height: 1920,
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'VT323', monospace",
        gap: 48,
      }}
    >
      <div style={{ border: '6px solid #f5f5f0', padding: '24px 64px' }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 56, color: '#f5f5f0' }}>SNITCH</span>
      </div>

      <div style={{ border: '4px solid #e8291c', padding: 20, lineHeight: 0 }}>
        <Avatar alive size={280} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 32, color: '#e8291c', margin: '0 0 16px' }}>
          GANADOR
        </p>
        <p style={{ fontSize: 72, color: '#f5f5f0', margin: 0, maxWidth: 950, wordBreak: 'break-word' }}>
          {winnerName}
        </p>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 26, color: '#4a4a4a', letterSpacing: 2, margin: '0 0 16px' }}>GANÓ CON</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          {hand.map((card, i) => (
            <CardFace key={i} card={card} />
          ))}
        </div>
      </div>

      {opponentNames.length > 0 && (
        <div style={{ textAlign: 'center', maxWidth: 900 }}>
          <p style={{ fontSize: 26, color: '#4a4a4a', letterSpacing: 2, margin: '0 0 12px' }}>LE GANÓ A</p>
          <p style={{ fontSize: 36, color: '#f5f5f0', margin: 0 }}>{opponentNames.join(' · ')}</p>
        </div>
      )}

    </div>
  );
});
