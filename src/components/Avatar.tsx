interface AvatarProps {
  alive: boolean;
  size?: number;
}

// Placeholder pixel art: un detective simple (sombrero + anteojos) hecho con
// rectángulos SVG, sin depender de sprites externos. Cuando el jugador está
// eliminado, se muestra en escala de grises (según el punto 15 del brief).
export function Avatar({ alive, size = 72 }: AvatarProps) {
  const strokeColor = alive ? 'var(--snitch-accent)' : 'var(--snitch-muted)';
  const fillColor = alive ? 'var(--snitch-fg)' : '#2a2a2a';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      role="img"
      aria-label={alive ? 'Jugador' : 'Jugador eliminado'}
    >
      {/* cara */}
      <rect x="3" y="6" width="10" height="7" fill={fillColor} />
      {/* sombrero: ala */}
      <rect x="1" y="4" width="14" height="2" fill={strokeColor} />
      {/* sombrero: copa */}
      <rect x="4" y="1" width="8" height="3" fill={strokeColor} />
      {/* banda del sombrero */}
      <rect x="3" y="6" width="10" height="1" fill={strokeColor} />
      {/* anteojos */}
      <rect x="4" y="8" width="3" height="2" fill={strokeColor} />
      <rect x="9" y="8" width="3" height="2" fill={strokeColor} />
      <rect x="7" y="8" width="2" height="1" fill={strokeColor} />
      {/* boca */}
      <rect x="6" y="11" width="4" height="1" fill={strokeColor} />
    </svg>
  );
}
