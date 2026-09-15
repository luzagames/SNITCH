import { SKINS } from '../game/skins';
import { useSkin } from '../hooks/useSkin';

export function SkinPicker({ onClose }: { onClose: () => void }) {
  const { skinId, setSkinId } = useSkin();

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
            return (
              <button
                key={skin.id}
                onClick={() => setSkinId(skin.id)}
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
                }}
              >
                {/* Muestra de colores: un cuadradito con el fondo/acento
                    reales de ESE skin (no del actual), para que se vea
                    antes de elegirlo. */}
                <span style={{ display: 'flex', flexShrink: 0, border: '1px solid #0003' }}>
                  <span style={{ width: 14, height: 28, background: skin.bg }} />
                  <span style={{ width: 14, height: 28, background: skin.accent }} />
                  <span style={{ width: 14, height: 28, background: skin.fg }} />
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', color: selected ? 'var(--snitch-accent)' : 'var(--snitch-fg)' }}>
                    {skin.name}
                    {selected ? ' ✓' : ''}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--snitch-muted)' }}>{skin.description}</span>
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
