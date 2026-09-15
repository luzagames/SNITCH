import { useState } from 'react';
import {
  signInAnonymouslyUser,
  signInWithGoogle,
  signUpWithUsername,
  signInWithUsername,
  isValidUsername,
  describeUsernameAuthError,
} from '../firebase/auth';
import { detectInAppBrowser } from '../utils/inAppBrowser';
import '../styles/theme.css';

type Mode = 'choice' | 'username-signup' | 'username-login';

export function LoginChoiceScreen() {
  const [loading, setLoading] = useState<'google' | 'anon' | 'username' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [mode, setMode] = useState<Mode>('choice');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const inAppBrowser = detectInAppBrowser();

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }

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

  function backToChoice() {
    setMode('choice');
    setError(null);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  }

  async function handleUsernameSubmit() {
    setError(null);

    if (!isValidUsername(username)) {
      setError('El usuario tiene que tener entre 3 y 20 caracteres — solo letras, números y guión bajo.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña necesita al menos 6 caracteres.');
      return;
    }
    if (mode === 'username-signup' && password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading('username');
    try {
      if (mode === 'username-signup') {
        await signUpWithUsername(username, password);
      } else {
        await signInWithUsername(username, password);
      }
      // Igual que con Google: onAuthStateChanged en SnitchApp se encarga
      // de sacar esta pantalla apenas detecta el login.
    } catch (e) {
      setError(describeUsernameAuthError(e));
      setLoading(null);
    }
  }

  if (mode !== 'choice') {
    return (
      <div className="snitch-root" style={{ padding: 'clamp(16px, 6vw, 40px)', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 'clamp(28px, 8vw, 40px)' }}>SNITCH</h1>
        <p style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 16, marginTop: 24 }}>
          {mode === 'username-signup' ? 'CREAR CUENTA' : 'INICIAR SESIÓN'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 300, margin: '20px auto 0' }}>
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
            autoComplete={mode === 'username-signup' ? 'new-password' : 'current-password'}
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
          {mode === 'username-signup' && (
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
          )}

          <button className="snitch-btn-accent" onClick={handleUsernameSubmit} disabled={loading !== null}>
            {loading === 'username' ? 'Conectando...' : mode === 'username-signup' ? 'CREAR CUENTA' : 'ENTRAR'}
          </button>

          <button onClick={() => setMode(mode === 'username-signup' ? 'username-login' : 'username-signup')} disabled={loading !== null} style={{ fontSize: 13 }}>
            {mode === 'username-signup' ? '¿Ya tenés cuenta? Iniciá sesión' : '¿No tenés cuenta? Creá una'}
          </button>

          <button onClick={backToChoice} disabled={loading !== null} style={{ fontSize: 13, color: 'var(--snitch-muted)' }}>
            Volver
          </button>
        </div>

        {error && <p style={{ color: 'var(--snitch-accent)', marginTop: 16, maxWidth: 300, marginInline: 'auto' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="snitch-root" style={{ padding: 'clamp(16px, 6vw, 40px)', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 'clamp(28px, 8vw, 40px)' }}>SNITCH</h1>

      {inAppBrowser.detected && (
        <div
          style={{
            maxWidth: 340,
            margin: '20px auto 0',
            padding: '12px 16px',
            border: '2px solid var(--snitch-accent)',
            textAlign: 'left',
          }}
        >
          <p style={{ fontSize: 14, margin: 0 }}>
            Estás abriendo esto desde <b>{inAppBrowser.appName}</b>. El login con Google no funciona bien en este
            navegador "de prestado" — pero <b>"JUGAR COMO ANÓNIMO"</b> y <b>"CREAR CUENTA"</b> sí andan
            normal.
          </p>
          <p style={{ fontSize: 13, color: 'var(--snitch-muted)', margin: '8px 0 0' }}>
            Para usar Google, abrí este link en Chrome o Safari (buscá "Abrir en el navegador" en el menú de{' '}
            {inAppBrowser.appName}), o copialo acá:
          </p>
          <button onClick={handleCopyLink} style={{ marginTop: 8, fontSize: 13 }}>
            {linkCopied ? '¡Copiado!' : 'COPIAR LINK'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '32px auto 0' }}>
        <button className="snitch-btn-accent" onClick={handleGoogle} disabled={loading !== null}>
          {loading === 'google' ? 'Conectando...' : 'INICIAR SESIÓN CON GOOGLE'}
        </button>
        <button onClick={() => setMode('username-signup')} disabled={loading !== null}>
          CREAR CUENTA
        </button>
        <button onClick={handleAnonymous} disabled={loading !== null}>
          {loading === 'anon' ? 'Conectando...' : 'JUGAR COMO ANÓNIMO'}
        </button>
      </div>

      <p style={{ fontSize: 14, color: 'var(--snitch-muted)', marginTop: 20, maxWidth: 320, marginInline: 'auto' }}>
        Con Google o con usuario y contraseña guardás tus estadísticas y logros entre partidas. Jugando como
        anónimo, no.
      </p>

      {error && <p style={{ color: 'var(--snitch-accent)', marginTop: 16 }}>{error}</p>}
    </div>
  );
}
