import { useMemo } from 'react';

const COLORS = ['var(--snitch-accent)', 'var(--snitch-fg)', '#FFE066', '#92FCE6', '#D7D7D7'];

// Se calcula UNA sola vez por partida (useMemo sin dependencias que
// cambien) — si se recalculara en cada render, el confeti "saltaría" de
// posición en vez de caer de forma prolija.
export function Confetti({ count = 40 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2 + Math.random() * 1.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      })),
    [count]
  );

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 5 }} aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="snitch-confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
