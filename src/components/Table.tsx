import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { PlayerSeat } from './PlayerSeat';
import type { PlayerSeatData } from './PlayerSeat';

const WIDTH = 760;
const HEIGHT = 520;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const RADIUS_X = 320;
const RADIUS_Y = 210;

// Calcula la posición de cada jugador distribuido en una elipse, empezando
// arriba y en sentido horario (coincide con "el turno avanza hacia la derecha").
function seatPosition(index: number, total: number) {
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

export function Table({ players }: { players: PlayerSeatData[] }) {
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
        {players.map((p, i) => {
          const { x, y } = seatPosition(i, players.length);
          return (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                top: y,
                left: x,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <PlayerSeat player={p} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
