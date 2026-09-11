import { useState } from 'react';
import { signInAnonymouslyUser, signInWithGoogle } from '../firebase/auth';
import '../styles/theme.css';

export function LoginChoiceScreen() {
  const [loading, setLoading] = useState<'google' | 'anon' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setLoading('google');
    setError(null);
    try {
      await signInWithGoogle();
      // No hace falta hacer nada más acá: onAuthStateChanged en SnitchApp
      // va a detectar el login y sacar esta pantalla solo.
    } catch (e) {
      setError((e as Error).message);
      setLoading(null);
    }
  }

  async function handleAnonymous() {
    setLoading('anon');
    setError(null);
    try {
      await signInAnonymouslyUser();
    } catch (e) {
      setError((e as Error).message);
      setLoading(null);
    }
  }

  return (
    <div className="snitch-root" style={{ padding: 'clamp(16px, 6vw, 40px)', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 'clamp(28px, 8vw, 40px)' }}>SNITCH</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '32px auto 0' }}>
        <button className="snitch-btn-accent" onClick={handleGoogle} disabled={loading !== null}>
          {loading === 'google' ? 'Conectando...' : 'INICIAR SESIÓN CON GOOGLE'}
        </button>
        <button onClick={handleAnonymous} disabled={loading !== null}>
          {loading === 'anon' ? 'Conectando...' : 'JUGAR COMO ANÓNIMO'}
        </button>
      </div>

      <p style={{ fontSize: 14, color: 'var(--snitch-muted)', marginTop: 20, maxWidth: 320, marginInline: 'auto' }}>
        Con Google guardás tus estadísticas y logros entre partidas. Jugando como anónimo, no.
      </p>

      {error && <p style={{ color: 'var(--snitch-accent)', marginTop: 16 }}>{error}</p>}
    </div>
  );
}
