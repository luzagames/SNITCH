import { Avatar } from './Avatar';

export interface IntroPlayer {
  id: string;
  name: string;
  isYou: boolean;
  palette: { stroke: string; fill: string };
  headId: string;
}

export function MatchIntroScreen({ players, onSkip }: { players: IntroPlayer[]; onSkip: () => void }) {
  return (
    <div
      className="snitch-root"
      style={{
        padding: 'clamp(16px, 6vw, 40px)',
        textAlign: 'center',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onSkip}
    >
      <p
        className="snitch-winner-pop"
        style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 'clamp(20px, 6vw, 30px)', color: 'var(--snitch-accent)', margin: 0 }}
      >
        ¡EMPIEZA LA PARTIDA!
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'clamp(16px, 5vw, 32px)',
          justifyContent: 'center',
          marginTop: 'clamp(24px, 8vw, 48px)',
          maxWidth: 560,
        }}
      >
        {players.map((p, i) => (
          <div
            key={p.id}
            className="snitch-intro-player-pop"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, animationDelay: `${i * 0.12}s` }}
          >
            <Avatar alive size={72} palette={p.palette} headId={p.headId} />
            <span style={{ fontSize: 16 }}>
              {p.name}
              {p.isYou ? ' (vos)' : ''}
            </span>
          </div>
        ))}
      </div>

      <p className="snitch-blink" style={{ fontSize: 13, color: 'var(--snitch-muted)', marginTop: 'clamp(28px, 8vw, 48px)' }}>
        Tocá para continuar
      </p>
    </div>
  );
}
