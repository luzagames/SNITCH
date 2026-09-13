import { RankGemIcon } from './RankGemIcon';
import type { Tier } from '../game/rank';

export function RankChangeToast({ from, to }: { from: Tier; to: Tier }) {
  const wentUp = to.minOrdinal > from.minOrdinal;

  return (
    <div
      className="snitch-toast-anim"
      style={{
        position: 'fixed',
        top: 90,
        left: '50%',
        zIndex: 50,
        background: 'var(--snitch-bg)',
        border: `2px solid ${to.light}`,
        padding: '10px 16px',
        maxWidth: 'min(360px, 90vw)',
        textAlign: 'center',
        boxShadow: `0 0 16px ${to.light}80`,
      }}
      role="status"
    >
      <p style={{ margin: 0, fontSize: 13, color: to.light }}>{wentUp ? '¡SUBISTE DE RANGO!' : 'BAJASTE DE RANGO'}</p>
      <p style={{ margin: '4px 0 0', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <RankGemIcon light={from.light} dark={from.dark} size={16} />
        {from.name} → {to.name}
        <RankGemIcon light={to.light} dark={to.dark} size={16} />
      </p>
    </div>
  );
}
