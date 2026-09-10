import '../styles/theme.css';

export function LoadingScreen({ message, isError = false }: { message: string; isError?: boolean }) {
  return (
    <div
      className="snitch-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 20,
        textAlign: 'center',
        padding: 'clamp(16px, 6vw, 40px)',
      }}
    >
      <p style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 'clamp(28px, 8vw, 40px)', margin: 0 }}>
        SNITCH
      </p>
      <p
        className={isError ? undefined : 'snitch-blink'}
        style={{
          fontSize: 'clamp(18px, 5vw, 22px)',
          color: isError ? 'var(--snitch-accent)' : 'var(--snitch-muted)',
          margin: 0,
        }}
      >
        {message}
      </p>
    </div>
  );
}
