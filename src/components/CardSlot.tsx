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
      <div
        style={{
          ...base,
          backgroundColor: 'var(--snitch-bg)',
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(232, 41, 28, 0.18) 0, rgba(232, 41, 28, 0.18) 1px, transparent 1px, transparent 6px), ' +
            'repeating-linear-gradient(-45deg, rgba(232, 41, 28, 0.18) 0, rgba(232, 41, 28, 0.18) 1px, transparent 1px, transparent 6px)',
        }}
        aria-label="Carta oculta"
      >
        <svg width={size * 0.35} height={size * 0.49} viewBox="0 0 5 7" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="1" y="0" width="3" height="1" fill="var(--snitch-fg)" />
          <rect x="0" y="1" width="1" height="1" fill="var(--snitch-fg)" />
          <rect x="4" y="1" width="1" height="1" fill="var(--snitch-fg)" />
          <rect x="4" y="2" width="1" height="1" fill="var(--snitch-fg)" />
          <rect x="3" y="3" width="1" height="1" fill="var(--snitch-fg)" />
          <rect x="2" y="4" width="1" height="1" fill="var(--snitch-fg)" />
          <rect x="2" y="6" width="1" height="1" fill="var(--snitch-fg)" />
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
        style={{ ...base, background: 'var(--snitch-card-paper)', borderColor: 'var(--snitch-accent)', flexDirection: 'column', gap: 2 }}
        aria-label="Carta Joker"
      >
        {/* El avatar se dibuja con relleno hueso/blanco (para que combine
            con el resto de la app) — en algunos skins ese tono es
            parecido al papel de la carta, así que se "pierde". Le
            agregamos un contorno fino con drop-shadow (sigue el
            contorno real del dibujo, no un rectángulo) para que
            contraste igual, usando el fondo del tema como color de
            trazo (siempre oscuro en los 5 skins actuales). */}
        <Avatar alive size={size * 0.6} className="snitch-joker-outline" />
        <span style={{ color: 'var(--snitch-accent)', fontSize: Math.round(size * (10 / 34)), letterSpacing: 1 }}>JOKER</span>
      </div>
    );
  }

  const suitColor = isRedSuit(card.suit) ? 'var(--snitch-accent)' : 'var(--snitch-card-ink)';

  return (
    <div
      style={{
        ...base,
        background: 'var(--snitch-card-paper)',
        borderColor: 'var(--snitch-card-ink)',
        gap: 1,
      }}
      aria-label={`Carta ${cardLabel(card)}`}
    >
      <span style={{ color: 'var(--snitch-card-ink)' }}>{RANK_LABELS[card.rank]}</span>
      <SuitIcon suit={card.suit} color={suitColor} size={Math.round(size * (14 / 34))} />
    </div>
  );
}

export type { CardSlotState };
