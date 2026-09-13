import { STARTING_LIVES } from '../game/rules';

interface HeartsProps {
  lives: number;
  maxLives?: number;
}

function PixelHeart({ filled }: { filled: boolean }) {
  const color = filled ? 'var(--snitch-accent)' : 'var(--snitch-outline)';
  return (
    <svg width="16" height="14" viewBox="0 0 7 6" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="1" y="0" width="2" height="1" fill={color} />
      <rect x="4" y="0" width="2" height="1" fill={color} />
      <rect x="0" y="1" width="7" height="2" fill={color} />
      <rect x="1" y="3" width="5" height="1" fill={color} />
      <rect x="2" y="4" width="3" height="1" fill={color} />
      <rect x="3" y="5" width="1" height="1" fill={color} />
    </svg>
  );
}

export function Hearts({ lives, maxLives = STARTING_LIVES }: HeartsProps) {
  const danger = lives === 1;
  return (
    <div style={{ display: 'flex', gap: 3 }} aria-label={`${lives} de ${maxLives} vidas`}>
      {Array.from({ length: maxLives }, (_, i) => {
        const filled = i < lives;
        return (
          <span
            key={`${i}-${filled}`}
            className={danger && filled ? 'snitch-heart-pop-danger' : 'snitch-heart-pop'}
            style={{ display: 'inline-flex' }}
          >
            <PixelHeart filled={filled} />
          </span>
        );
      })}
    </div>
  );
}
