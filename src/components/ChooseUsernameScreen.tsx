import { useState } from 'react';
import { updateUsername } from '../firebase/profile';
import '../styles/theme.css';

export function ChooseUsernameScreen({
  uid,
  suggested,
  onDone,
}: {
  uid: string;
  suggested: string;
  onDone: (username: string) => void;
}) {
  const [username, setUsername] = useState(suggested);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!username.trim()) {
      setError('Ingresá un nombre de usuario.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateUsername(uid, username.trim());
      onDone(username.trim());
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="snitch-root" style={{ padding: 'clamp(16px, 6vw, 40px)', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 'clamp(24px, 7vw, 32px)' }}>SNITCH</h1>

      <p style={{ fontSize: 18, marginTop: 24 }}>Elegí tu nombre de usuario</p>
      <p style={{ fontSize: 14, color: 'var(--snitch-muted)', marginTop: 4 }}>
        Es tu identidad fija en SNITCH — después lo podés cambiar desde tu perfil.
      </p>

      <div style={{ maxWidth: 320, margin: '20px auto 0' }}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: '100%',
            fontSize: 20,
            fontFamily: 'var(--snitch-font-body)',
            background: 'transparent',
            color: 'var(--snitch-fg)',
            border: '2px solid var(--snitch-fg)',
            padding: 8,
            marginBottom: 16,
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        />
        <button className="snitch-btn-accent" onClick={handleContinue} disabled={saving} style={{ width: '100%' }}>
          {saving ? 'Guardando...' : 'CONTINUAR'}
        </button>
      </div>

      {error && <p style={{ color: 'var(--snitch-accent)', marginTop: 16 }}>{error}</p>}
    </div>
  );
}
