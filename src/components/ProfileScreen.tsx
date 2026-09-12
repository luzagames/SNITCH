import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getProfileAndRepair, updateUsername } from '../firebase/profile';
import type { UserProfile } from '../firebase/profile';
import { ACHIEVEMENTS } from '../game/achievements';
import { getTier, getNextTier, skillOrdinal } from '../game/rank';
import { RankGemIcon } from './RankGemIcon';
import { LoadingScreen } from './LoadingScreen';
import '../styles/theme.css';

export function ProfileScreen({
  uid,
  onBack,
  onUsernameChanged,
}: {
  uid: string;
  onBack: () => void;
  onUsernameChanged: (username: string) => void;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfileAndRepair(uid)
      .then((p) => {
        setProfile(p);
        setNameInput(p?.username ?? '');
      })
      .finally(() => setLoading(false));
  }, [uid]);

  async function handleSaveName() {
    if (!nameInput.trim()) {
      setError('Ingresá un nombre.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateUsername(uid, nameInput.trim());
      setProfile((prev) => (prev ? { ...prev, username: nameInput.trim() } : prev));
      onUsernameChanged(nameInput.trim());
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingScreen message="Cargando perfil..." />;
  }

  if (!profile) {
    return (
      <div className="snitch-root" style={{ padding: 'clamp(16px, 6vw, 40px)', textAlign: 'center' }}>
        <p>No se pudo cargar tu perfil.</p>
        <button onClick={onBack} style={{ marginTop: 16 }}>
          VOLVER
        </button>
      </div>
    );
  }

  const winRate = profile.gamesPlayed > 0 ? Math.round((profile.wins / profile.gamesPlayed) * 100) : 0;
  const killAccuracy = profile.killAttempts > 0 ? Math.round((profile.killHits / profile.killAttempts) * 100) : 0;
  const totalActions = profile.killAttempts + profile.askCount + profile.passCount;
  const killSharePct = totalActions > 0 ? Math.round((profile.killAttempts / totalActions) * 100) : 0;
  const askSharePct = totalActions > 0 ? Math.round((profile.askCount / totalActions) * 100) : 0;
  const passSharePct = totalActions > 0 ? Math.round((profile.passCount / totalActions) * 100) : 0;

  const ordinal = skillOrdinal({ mu: profile.mu, sigma: profile.sigma });
  const tier = getTier(ordinal);
  const nextTier = getNextTier(tier.id);
  const progressPct = nextTier
    ? Math.min(100, Math.round(((ordinal - tier.minOrdinal) / (nextTier.minOrdinal - tier.minOrdinal)) * 100))
    : 100;

  return (
    <div className="snitch-root" style={{ padding: 'clamp(16px, 6vw, 40px)', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 'clamp(24px, 7vw, 32px)' }}>PERFIL</h1>

      {!editing ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '16px 0' }}>
          <p style={{ fontSize: 24, margin: 0 }}>{profile.username}</p>
          <button
            onClick={() => {
              setNameInput(profile.username);
              setEditing(true);
              setError(null);
            }}
            style={{ fontSize: 12, padding: '4px 8px' }}
          >
            CAMBIAR
          </button>
        </div>
      ) : (
        <div style={{ maxWidth: 280, margin: '16px auto' }}>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            style={{
              width: '100%',
              fontSize: 18,
              fontFamily: 'var(--snitch-font-body)',
              background: 'transparent',
              color: 'var(--snitch-fg)',
              border: '2px solid var(--snitch-fg)',
              padding: 6,
              marginBottom: 8,
              boxSizing: 'border-box',
              textAlign: 'center',
            }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="snitch-btn-accent" onClick={handleSaveName} disabled={saving}>
              {saving ? 'Guardando...' : 'GUARDAR'}
            </button>
            <button onClick={() => setEditing(false)} disabled={saving}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ color: 'var(--snitch-accent)', fontSize: 14 }}>{error}</p>}

      <div style={{ maxWidth: 280, margin: '0 auto 20px' }}>
        <p
          style={{
            fontFamily: 'var(--snitch-font-display)',
            fontSize: 22,
            color: 'var(--snitch-accent)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <RankGemIcon light={tier.light} dark={tier.dark} size={26} />
          {tier.name.toUpperCase()}
        </p>
        <div style={{ height: 10, border: '1px solid var(--snitch-muted)', background: 'transparent', marginTop: 8 }}>
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'var(--snitch-accent)',
            }}
          />
        </div>
        <p style={{ fontSize: 12, color: 'var(--snitch-muted)', marginTop: 4 }}>
          {nextTier ? `${progressPct}% hacia ${nextTier.name}` : '¡Rango máximo alcanzado!'}
        </p>
        <p style={{ fontSize: 11, color: 'var(--snitch-muted)', marginTop: 8 }}>
          Sube o baja según a quién le ganás o perdés, y qué tan grande era la mesa.
        </p>
      </div>

      <SectionTitle>General</SectionTitle>
      <StatBlock>
        <StatRow label="Partidas jugadas" value={profile.gamesPlayed} />
        <StatRow label="Victorias" value={profile.wins} />
        <StatRow label="Derrotas" value={profile.losses} />
        <StatRow label="% de victorias" value={`${winRate}%`} />
        <StatRow label="Racha actual" value={profile.currentStreak} />
        <StatRow label="Mejor racha" value={profile.bestStreak} />
      </StatBlock>

      <SectionTitle>KILL</SectionTitle>
      <StatBlock>
        <StatRow label="Precisión de KILL" value={profile.killAttempts > 0 ? `${killAccuracy}%` : '—'} />
        <StatRow label="Jokers cazados" value={profile.jokersCaught} />
      </StatBlock>

      <SectionTitle>Bluff</SectionTitle>
      <StatBlock>
        <StatRow label="Bluffs realizados" value={profile.selfBluffs} />
        <StatRow label="Bluffs exitosos" value={profile.successfulBluffs} />
      </StatBlock>

      <SectionTitle>Estilo de juego</SectionTitle>
      <StatBlock>
        <StatRow label="% KILL" value={totalActions > 0 ? `${killSharePct}%` : '—'} />
        <StatRow label="% PREGUNTAR" value={totalActions > 0 ? `${askSharePct}%` : '—'} />
        <StatRow label="% PASAR" value={totalActions > 0 ? `${passSharePct}%` : '—'} />
      </StatBlock>

      <SectionTitle>{`Logros (${profile.achievements.length}/${ACHIEVEMENTS.length})`}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 320, margin: '0 auto' }}>
        {ACHIEVEMENTS.map((a) => {
          const unlocked = profile.achievements.includes(a.id);
          return (
            <div
              key={a.id}
              style={{
                textAlign: 'left',
                border: `2px solid ${unlocked ? 'var(--snitch-accent)' : 'var(--snitch-muted)'}`,
                padding: '8px 10px',
                opacity: unlocked ? 1 : 0.5,
              }}
            >
              <p style={{ margin: 0, fontSize: 16, color: unlocked ? 'var(--snitch-accent)' : 'var(--snitch-fg)' }}>
                {unlocked ? a.name : '??? (bloqueado)'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--snitch-muted)' }}>
                {unlocked ? a.description : 'Todavía no lo desbloqueaste.'}
              </p>
            </div>
          );
        })}
      </div>

      <button className="snitch-btn-accent" onClick={onBack} style={{ marginTop: 32 }}>
        VOLVER
      </button>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 13, color: 'var(--snitch-accent)', margin: '20px 0 6px', letterSpacing: 1 }}>
      {children.toUpperCase()}
    </p>
  );
}

function StatBlock({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 280, margin: '0 auto' }}>{children}</div>;
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--snitch-muted)', padding: '6px 4px' }}>
      <span style={{ color: 'var(--snitch-muted)' }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
