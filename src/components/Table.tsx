import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { PlayerSeat } from './PlayerSeat';
import type { PlayerSeatData } from './PlayerSeat';
import { CardSlot } from './CardSlot';
import type { Card } from '../game/types';

const WIDTH = 820;
const HEIGHT = 650;
const CENTER_X = WIDTH / 2;
const CENTER_Y = 350; // fijo, independiente de HEIGHT, para no correr el margen de arriba
const RADIUS_X = 320;
const RADIUS_Y = 210;

// Posición de "vos": fija, siempre abajo al centro, sin importar el orden
// real de turno. Coincide con el asiento agrandado (featured), que ahora
// no tiene fila de cartas propia (la mano se ve aparte, en "TU MANO"),
// así que es más compacto en alto pese al avatar más grande.
const YOU_Y = CENTER_Y + 175;

// Los demás jugadores se distribuyen en un arco arriba de la mesa (no toda
// la elipse, solo la mitad superior), centrado en la posición "12 en punto"
// y abarcando ±75° desde ahí.
const ARC_HALF_ANGLE = (75 * Math.PI) / 180;
const ARC_CENTER_ANGLE = -Math.PI / 2;

function otherSeatPosition(index: number, total: number) {
  if (total === 1) {
    return { x: CENTER_X + RADIUS_X * Math.cos(ARC_CENTER_ANGLE), y: CENTER_Y + RADIUS_Y * Math.sin(ARC_CENTER_ANGLE) };
  }
  const angle = ARC_CENTER_ANGLE - ARC_HALF_ANGLE + (2 * ARC_HALF_ANGLE * index) / (total - 1);
  const x = CENTER_X + RADIUS_X * Math.cos(angle);
  const y = CENTER_Y + RADIUS_Y * Math.sin(angle);
  return { x, y };
}

// Fallback: la vieja distribución en elipse completa, para casos donde no
// se identifica a "vos" entre los jugadores (por ejemplo, un demo/test que
// no marca isYou en nadie).
function fullEllipsePosition(index: number, total: number) {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const x = CENTER_X + RADIUS_X * Math.cos(angle);
  const y = CENTER_Y + RADIUS_Y * Math.sin(angle);
  return { x, y };
}

function CenterLogo() {
  const corner = (top: number | string, left: number | string): CSSProperties => ({
    position: 'absolute',
    top,
    left,
    width: 10,
    height: 10,
    background: 'var(--snitch-fg)',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: CENTER_Y,
        left: CENTER_X,
        transform: 'translate(-50%, -50%)',
        border: '4px solid var(--snitch-fg)',
        padding: '28px 48px',
      }}
    >
      <div style={corner(-2, -2)} />
      <div style={corner(-2, 'calc(100% - 8px)')} />
      <div style={corner('calc(100% - 8px)', -2)} />
      <div style={corner('calc(100% - 8px)', 'calc(100% - 8px)')} />
      <span
        style={{
          fontFamily: 'var(--snitch-font-display)',
          fontSize: 32,
          color: 'var(--snitch-fg)',
          whiteSpace: 'nowrap',
        }}
      >
        SNITCH
      </span>
    </div>
  );
}

function Seat({ player, x, y, featured }: { player: PlayerSeatData; x: number; y: number; featured: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: x,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <PlayerSeat player={player} featured={featured} />
    </div>
  );
}

export function Table({ players, flashCard }: { players: PlayerSeatData[]; flashCard?: Card | null }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const availableWidth = entries[0].contentRect.width;
      setScale(Math.min(1, availableWidth / WIDTH));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const youIndex = players.findIndex((p) => p.isYou);

  let seats: { player: PlayerSeatData; x: number; y: number; featured: boolean }[];

  if (youIndex === -1) {
    // Fallback sin POV: elipse completa como antes.
    seats = players.map((p, i) => ({ player: p, ...fullEllipsePosition(i, players.length), featured: false }));
  } else {
    const you = players[youIndex];
    // Rotamos para que el orden empiece en el siguiente jugador después de
    // vos y dé toda la vuelta — así el arco de arriba respeta el sentido
    // real de turno visto desde tu lugar.
    const others = [...players.slice(youIndex + 1), ...players.slice(0, youIndex)];

    seats = [
      { player: you, x: CENTER_X, y: YOU_Y, featured: true },
      ...others.map((p, i) => ({ player: p, ...otherSeatPosition(i, others.length), featured: false })),
    ];
  }

  return (
    <div
      ref={stageRef}
      style={{
        width: '100%',
        maxWidth: WIDTH,
        margin: '0 auto',
        height: HEIGHT * scale,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: WIDTH,
          height: HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <CenterLogo />
        {flashCard && (
          <div
            style={{
              position: 'absolute',
              top: CENTER_Y,
              left: CENTER_X,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              boxShadow: '0 0 16px rgba(232, 41, 28, 0.7)',
            }}
            aria-live="polite"
          >
            <CardSlot state={{ kind: 'faceup', card: flashCard }} size={34} />
          </div>
        )}
        {seats.map((s) => (
          <Seat key={s.player.id} player={s.player} x={s.x} y={s.y} featured={s.featured} />
        ))}
      </div>
    </div>
  );
}
