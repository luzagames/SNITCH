import { useState } from 'react';
import { upgradeAnonymousToUsername, isValidUsername, describeUsernameAuthError } from '../firebase/auth';

export function UpgradeAccountModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!isValidUsername(username)) {
      setError('El usuario tiene que tener entre 3 y 20 caracteres — solo letras, números y guión bajo.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña necesita al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await upgradeAnonymousToUsername(username, password);
      onDone();
    } catch (e) {
      setError(describeUsernameAuthError(e));
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="snitch-panel-enter"
        style={{
          background: 'var(--snitch-bg)',
          border: '2px solid var(--snitch-fg)',
          padding: 20,
          maxWidth: 320,
          width: '100%',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 16, margin: '0 0 6px' }}>CREAR CUENTA</p>
        <p style={{ fontSize: 12, color: 'var(--snitch-muted)', margin: '0 0 16px' }}>
          Guardá tus estadísticas, logros y skins — sin perder nada de lo que ya tenías en esta sesión.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            style={{
              fontSize: 18,
              fontFamily: 'var(--snitch-font-body)',
              background: 'transparent',
              color: 'var(--snitch-fg)',
              border: '2px solid var(--snitch-fg)',
              padding: 8,
              boxSizing: 'border-box',
            }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            style={{
              fontSize: 18,
              fontFamily: 'var(--snitch-font-body)',
              background: 'transparent',
              color: 'var(--snitch-fg)',
              border: '2px solid var(--snitch-fg)',
              padding: 8,
              boxSizing: 'border-box',
            }}
          />
          <input
            type="password"
            placeholder="Repetir contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            style={{
              fontSize: 18,
              fontFamily: 'var(--snitch-font-body)',
              background: 'transparent',
              color: 'var(--snitch-fg)',
              border: '2px solid var(--snitch-fg)',
              padding: 8,
              boxSizing: 'border-box',
            }}
          />

          <button className="snitch-btn-accent" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creando...' : 'CREAR CUENTA'}
          </button>
          <button onClick={onClose} disabled={loading} style={{ fontSize: 13, color: 'var(--snitch-muted)' }}>
            Cancelar
          </button>
        </div>

        {error && <p style={{ color: 'var(--snitch-accent)', marginTop: 14, fontSize: 13 }}>{error}</p>}
      </div>
    </div>
  );
}
