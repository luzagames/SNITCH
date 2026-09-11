import { useEffect, useState } from 'react';
import { ACHIEVEMENTS } from '../game/achievements';
import type { AchievementId } from '../game/achievements';

const DISPLAY_DURATION_MS = 3500;

export function useAchievementToastQueue() {
  const [queue, setQueue] = useState<AchievementId[]>([]);

  function pushAchievements(ids: AchievementId[]) {
    if (ids.length === 0) return;
    setQueue((prev) => [...prev, ...ids]);
  }

  const current = queue[0] ?? null;

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => {
      setQueue((prev) => prev.slice(1));
    }, DISPLAY_DURATION_MS);
    return () => clearTimeout(timer);
  }, [current]);

  return { current, pushAchievements };
}

export function AchievementToast({ achievementId }: { achievementId: AchievementId }) {
  const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (!def) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        background: 'var(--snitch-bg)',
        border: '2px solid var(--snitch-accent)',
        padding: '10px 16px',
        maxWidth: 'min(360px, 90vw)',
        textAlign: 'center',
        boxShadow: '0 0 16px rgba(232, 41, 28, 0.5)',
      }}
      role="status"
    >
      <p style={{ margin: 0, fontSize: 13, color: 'var(--snitch-accent)' }}>🏆 LOGRO DESBLOQUEADO</p>
      <p style={{ margin: '4px 0 0', fontSize: 18 }}>{def.name}</p>
      <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--snitch-muted)' }}>{def.description}</p>
    </div>
  );
}
