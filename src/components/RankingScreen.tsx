import { useEffect, useState } from 'react';
import { getLeaderboard, LEADERBOARD_CATEGORIES } from '../firebase/profile';
import type { LeaderboardCategory, LeaderboardEntry } from '../firebase/profile';
import { getTier } from '../game/rank';
import { RankGemIcon } from './RankGemIcon';
import { LoadingScreen } from './LoadingScreen';
import '../styles/theme.css';

const TOP_N = 5;

export function RankingScreen({ uid, onBack }: { uid: string; onBack: () => void }) {
  const [category, setCategory] = useState<LeaderboardCategory>('wins');
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEntries(null);
    setError(null);
    getLeaderboard(category, TOP_N)
      .then(setEntries)
      .catch((e) => setError((e as Error).message));
  }, [category]);

  function displayValue(entry: LeaderboardEntry): string {
    // "Mejor rango" ordena por el ordinal numérico, pero lo que se
    // MUESTRA es el nombre del rango (Bronce/Plata/Oro/etc.), no el
    // número crudo.
    return category === 'skillRating' ? getTier(entry.value).name : String(entry.value);
  }

  return (
    <div className="snitch-root" style={{ padding: 'clamp(16px, 6vw, 40px)', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 'clamp(24px, 7vw, 32px)' }}>RANKING</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, margin: '20px auto', maxWidth: 480 }}>
        {LEADERBOARD_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            style={{
              fontSize: 13,
              padding: '8px 10px',
              borderColor: category === c.id ? 'var(--snitch-accent)' : undefined,
              color: category === c.id ? 'var(--snitch-accent)' : undefined,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'var(--snitch-accent)' }}>{error}</p>}

      {!error && entries === null && <LoadingScreen message="Cargando ranking..." />}

      {!error && entries !== null && entries.length === 0 && (
        <p style={{ color: 'var(--snitch-muted)', marginTop: 32 }}>Todavía no hay nadie en esta categoría.</p>
      )}

      {!error && entries !== null && entries.length > 0 && (
        <div style={{ maxWidth: 360, margin: '0 auto' }}>
          {entries.map((entry, i) => (
            <div
              key={entry.uid}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 6px',
                borderBottom: '1px solid var(--snitch-muted)',
                color: entry.uid === uid ? 'var(--snitch-accent)' : 'var(--snitch-fg)',
              }}
            >
              <span style={{ fontSize: 18 }}>
                <span style={{ color: 'var(--snitch-muted)', marginRight: 10 }}>#{i + 1}</span>
                {entry.username}
                {entry.uid === uid ? ' (vos)' : ''}
              </span>
              <span style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
                {category === 'skillRating' && <RankGemIcon light={getTier(entry.value).light} dark={getTier(entry.value).dark} size={16} />}
                {displayValue(entry)}
              </span>
            </div>
          ))}
        </div>
      )}

      <button className="snitch-btn-accent" onClick={onBack} style={{ marginTop: 32 }}>
        VOLVER
      </button>
    </div>
  );
}
