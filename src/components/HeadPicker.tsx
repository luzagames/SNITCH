import { HEAD_DESIGNS } from '../game/heads';
import { Avatar } from './Avatar';

export function HeadPicker({
  wins,
  equippedHeadId,
  onEquip,
  onClose,
}: {
  wins: number;
  equippedHeadId: string;
  onEquip: (headId: string) => void;
  onClose: () => void;
}) {
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
          ELEGÍ UNA CABEZA
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {HEAD_DESIGNS.map((head) => {
            const unlocked = wins >= head.winsRequired;
            const selected = head.id === equippedHeadId;
            return (
              <button
                key={head.id}
                onClick={() => unlocked && onEquip(head.id)}
                disabled={!unlocked}
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
                <span style={{ flexShrink: 0, filter: unlocked ? 'none' : 'grayscale(1)' }}>
                  <Avatar alive headId={head.id} size={40} />
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', color: selected ? 'var(--snitch-accent)' : 'var(--snitch-fg)' }}>
                    {head.name}
                    {selected ? ' ✓' : ''}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--snitch-muted)' }}>
                    {unlocked
                      ? head.winsRequired === 0
                        ? 'Siempre disponible'
                        : `Desbloqueada (${head.winsRequired} victorias)`
                      : `🔒 Necesitás ${head.winsRequired} victorias (tenés ${wins})`}
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
