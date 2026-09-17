import { useEffect, useState } from 'react';
import { SKINS } from '../game/skins';
import { useSkin } from '../hooks/useSkin';
import { getProfileAndRepair } from '../firebase/profile';

export function SkinPicker({ uid, onClose }: { uid: string; onClose: () => void }) {
  const { skinId, setSkinId } = useSkin();
  const [killHits, setKillHits] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProfileAndRepair(uid)
      .then((profile) => {
        if (!cancelled) setKillHits(profile?.killHits ?? 0);
      })
      .catch(() => {
        if (!cancelled) setKillHits(0);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Mientras no sabemos cuántos KILLs exitosos tenés, no mostramos nada
  // como bloqueado ni desbloqueado todavía — total es un parpadeo de medio
  // segundo como mucho, no vale la pena una pantalla de carga aparte.
  const loaded = killHits !== null;

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
          maxWidth: 380,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 18, margin: '0 0 16px', textAlign: 'center' }}>
          ELEGÍ UN SKIN
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SKINS.map((skin) => {
            const selected = skin.id === skinId;
            const unlocked = !loaded || killHits >= skin.killHitsRequired;
            return (
              <button
                key={skin.id}
                onClick={() => unlocked && setSkinId(skin.id)}
                disabled={loaded && !unlocked}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textAlign: 'left',
                  padding: '10px 12px',
                  border: `2px solid ${selected ? 'var(--snitch-accent)' : 'var(--snitch-muted)'}`,
                  background: 'transparent',
                  fontSize: 16,
                  width: '100%',
                  opacity: unlocked ? 1 : 0.6,
                }}
              >
                {/* Muestra de colores: un cuadradito con el fondo/acento
                    reales de ESE skin (no del actual), para que se vea
                    antes de elegirlo. */}
                <span style={{ display: 'flex', flexShrink: 0, border: '1px solid #0003', filter: unlocked ? 'none' : 'grayscale(1)' }}>
                  <span style={{ width: 14, height: 28, background: skin.bg }} />
                  <span style={{ width: 14, height: 28, background: skin.accent }} />
                  <span style={{ width: 14, height: 28, background: skin.fg }} />
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', color: selected ? 'var(--snitch-accent)' : 'var(--snitch-fg)' }}>
                    {skin.name}
                    {selected ? ' ✓' : ''}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--snitch-muted)' }}>
                    {!loaded
                      ? skin.description
                      : unlocked
                        ? skin.killHitsRequired === 0
                          ? skin.description
                          : `Desbloqueado (${skin.killHitsRequired} KILLs exitosos)`
                        : `🔒 Necesitás ${skin.killHitsRequired} KILLs exitosos (tenés ${killHits})`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <button onClick={onClose} style={{ marginTop: 18, display: 'block', marginInline: 'auto', fontSize: 13 }}>
          CERRAR
        </button>
      </div>
    </div>
  );
}
