import { useEffect, useState } from 'react';
import { createRoom, joinRoom, type JoinRoomError } from '../firebase/rooms';
import { signOutUser } from '../firebase/auth';
import { SkinPicker } from './SkinPicker';
import { UpgradeAccountModal } from './UpgradeAccountModal';

const ERROR_MESSAGES: Record<JoinRoomError, string> = {
  not_found: 'Ese código no lleva a ninguna sala. Revisalo bien.',
  full: 'Esa sala ya está a full (6 detectives) — no entra ni uno más.',
  already_started: 'Esa partida ya arrancó sin vos. Buscá otra sala o armá la tuya.',
};

export function HomeScreen({
  uid,
  defaultName = '',
  isAnonymous,
  onEnterRoom,
  onOpenProfile,
  onOpenRules,
  onOpenRanking,
}: {
  uid: string;
  defaultName?: string;
  isAnonymous: boolean;
  onEnterRoom: (roomCode: string) => void;
  onOpenProfile: () => void;
  onOpenRules: () => void;
  onOpenRanking: () => void;
}) {
  const [mode, setMode] = useState<'home' | 'join'>('home');
  const [name, setName] = useState(defaultName);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSkinPicker, setShowSkinPicker] = useState(false);
  const [showSkinDisclaimer, setShowSkinDisclaimer] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Si entraste por un link compartido (con ?join=CODIGO), te ahorramos
  // tener que escribir el código a mano.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join');
    if (joinParam) {
      setJoinCode(joinParam.toUpperCase());
      setMode('join');
      // Limpiamos el parámetro de la URL para que no quede pegado si
      // recargan la página o comparten el link de vuelta sin querer.
      const url = new URL(window.location.href);
      url.searchParams.delete('join');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  async function handleCreate() {
    if (!name.trim()) {
      setError('Ingresá tu nombre primero.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const code = await createRoom(uid, name.trim(), isAnonymous);
      onEnterRoom(code);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!name.trim()) {
      setError('Ingresá tu nombre primero.');
      return;
    }
    if (!joinCode.trim()) {
      setError('Ingresá un código de sala.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await joinRoom(joinCode.trim().toUpperCase(), uid, name.trim(), isAnonymous);
    setLoading(false);
    if (result.ok) {
      onEnterRoom(joinCode.trim().toUpperCase());
    } else {
      setError(ERROR_MESSAGES[result.error]);
    }
  }

  function handleThemeClick() {
    if (isAnonymous) {
      setShowSkinDisclaimer(true);
    } else {
      setShowSkinPicker(true);
    }
  }

  return (
    <div className="snitch-root" style={{ padding: 'clamp(16px, 6vw, 40px)', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 'clamp(28px, 8vw, 40px)' }}>SNITCH</h1>

      <div style={{ margin: '24px auto', maxWidth: 320 }}>
        <input
          type="text"
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          readOnly={!isAnonymous}
          title={!isAnonymous ? 'Tu nombre está fijo — cambialo desde tu perfil' : undefined}
          style={{
            width: '100%',
            fontSize: 20,
            fontFamily: 'var(--snitch-font-body)',
            background: 'transparent',
            color: !isAnonymous ? 'var(--snitch-muted)' : 'var(--snitch-fg)',
            border: '2px solid var(--snitch-fg)',
            padding: 8,
            marginBottom: 4,
            boxSizing: 'border-box',
          }}
        />
        {!isAnonymous && (
          <p style={{ fontSize: 12, color: 'var(--snitch-muted)', margin: '0 0 12px' }}>
            Fijo — cambialo desde tu perfil
          </p>
        )}
      </div>

      {mode === 'home' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '0 auto' }}>
          <button className="snitch-btn-accent" onClick={handleCreate} disabled={loading}>
            CREAR SALA
          </button>
          <button onClick={() => setMode('join')} disabled={loading}>
            UNIRSE A SALA
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '0 auto' }}>
          <input
            type="text"
            placeholder="CÓDIGO DE SALA"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            style={{
              fontSize: 20,
              fontFamily: 'var(--snitch-font-body)',
              background: 'transparent',
              color: 'var(--snitch-fg)',
              border: '2px solid var(--snitch-fg)',
              padding: 8,
              textAlign: 'center',
              letterSpacing: 4,
            }}
          />
          <button className="snitch-btn-accent" onClick={handleJoin} disabled={loading}>
            UNIRSE
          </button>
          <button onClick={() => setMode('home')} disabled={loading}>
            Volver
          </button>
        </div>
      )}

      {error && <p style={{ color: 'var(--snitch-accent)', marginTop: 16 }}>{error}</p>}

      {!isAnonymous && (
        <button onClick={onOpenProfile} style={{ marginTop: 24, fontSize: 14 }}>
          PERFIL
        </button>
      )}

      <div>
        <button onClick={onOpenRules} style={{ marginTop: 12, fontSize: 13 }}>
          CÓMO SE JUEGA
        </button>
      </div>

      {!isAnonymous && (
        <div>
          <button onClick={onOpenRanking} style={{ marginTop: 12, fontSize: 13 }}>
            RANKING
          </button>
        </div>
      )}

      <div>
        <button onClick={handleThemeClick} style={{ marginTop: 12, fontSize: 13 }}>
          🎨 TEMA
        </button>
      </div>

      {isAnonymous && (
        <div>
          <button onClick={() => setShowUpgradeModal(true)} style={{ marginTop: 12, fontSize: 13 }}>
            CREAR CUENTA
          </button>
        </div>
      )}

      <div>
        <button onClick={() => signOutUser()} style={{ marginTop: 12, fontSize: 13, color: 'var(--snitch-muted)' }}>
          CERRAR SESIÓN
        </button>
      </div>

      {showSkinPicker && <SkinPicker uid={uid} onClose={() => setShowSkinPicker(false)} />}

      {showSkinDisclaimer && (
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
          onClick={() => setShowSkinDisclaimer(false)}
        >
          <div
            className="snitch-panel-enter"
            style={{
              background: 'var(--snitch-bg)',
              border: '2px solid var(--snitch-accent)',
              padding: 20,
              maxWidth: 300,
              width: '100%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontSize: 16, margin: '0 0 16px' }}>
              Necesitás una cuenta para elegir un skin — jugando como anónimo no se puede guardar tu elección.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="snitch-btn-accent"
                onClick={() => {
                  setShowSkinDisclaimer(false);
                  setShowUpgradeModal(true);
                }}
              >
                CREAR CUENTA
              </button>
              <button onClick={() => setShowSkinDisclaimer(false)} style={{ fontSize: 13, color: 'var(--snitch-muted)' }}>
                Ahora no
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpgradeModal && (
        <UpgradeAccountModal onClose={() => setShowUpgradeModal(false)} onDone={() => setShowUpgradeModal(false)} />
      )}
    </div>
  );
}
