import { EMOTE_PHRASES } from '../game/emotes';

export function EmotePicker({
  onPick,
  onClose,
  cooldownRemaining,
}: {
  onPick: (phraseId: string) => void;
  onClose: () => void;
  cooldownRemaining: number; // segundos restantes de enfriamiento, 0 = ya se puede mandar
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        zIndex: 55,
        display: 'flex',
        alignItems: 'flex-end',
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
          padding: 16,
          maxWidth: 380,
          width: '100%',
          marginBottom: 'clamp(60px, 15vh, 120px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ fontSize: 14, color: 'var(--snitch-muted)', margin: '0 0 10px', textAlign: 'center' }}>
          {cooldownRemaining > 0 ? `Podés mandar otro en ${cooldownRemaining}s...` : 'Elegí qué decir:'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {EMOTE_PHRASES.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              disabled={cooldownRemaining > 0}
              style={{ fontSize: 15, padding: '8px 12px' }}
            >
              {p.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
