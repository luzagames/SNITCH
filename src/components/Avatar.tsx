interface AvatarProps {
  alive: boolean;
  size?: number;
  className?: string;
}

// Pixel art del detective, reconstruido con precisión a partir del sprite
// que armaste en Piskel (grilla de 18x11 — misma técnica que RankGemIcon:
// rectángulos SVG fusionados por fila, sin depender de una imagen
// externa). El sprite original es blanco y negro puro; acá lo recoloreamos
// con los mismos dos tonos que ya usa toda la app (rojo de acento /
// blanco), porque el negro puro se perdía contra el fondo negro del
// juego. Cuando el jugador está eliminado, se ve en gris (como antes).
//
// El dibujo en sí sigue siendo el mismo de 18x11 — para que el ícono
// renderice CUADRADO (18x18), le agregamos relleno transparente arriba y
// abajo (3 filas arriba, 4 abajo) en vez de estirar o recortar el arte.
export function Avatar({ alive, size = 72, className }: AvatarProps) {
  const strokeColor = alive ? 'var(--snitch-accent)' : 'var(--snitch-muted)';
  const fillColor = alive ? 'var(--snitch-fg)' : '#2a2a2a';
  const dy = 3; // filas de relleno arriba, antes de empezar a dibujar

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      shapeRendering="crispEdges"
      role="img"
      aria-label={alive ? 'Jugador' : 'Jugador eliminado'}
      className={className}
    >
      {/* sombrero: copa */}
      <rect x="5" y={0 + dy} width="8" height="1" fill={strokeColor} />
      <rect x="4" y={1 + dy} width="10" height="1" fill={strokeColor} />
      <rect x="4" y={2 + dy} width="10" height="1" fill={strokeColor} />
      {/* frente, visible debajo de la copa */}
      <rect x="4" y={3 + dy} width="10" height="1" fill={fillColor} />
      <rect x="4" y={4 + dy} width="10" height="1" fill={fillColor} />
      {/* sombrero: ala (todo el ancho) */}
      <rect x="0" y={5 + dy} width="18" height="1" fill={strokeColor} />
      {/* banda del sombrero */}
      <rect x="4" y={6 + dy} width="10" height="1" fill={strokeColor} />
      {/* anteojos */}
      <rect x="4" y={7 + dy} width="1" height="1" fill={fillColor} />
      <rect x="5" y={7 + dy} width="3" height="1" fill={strokeColor} />
      <rect x="8" y={7 + dy} width="2" height="1" fill={fillColor} />
      <rect x="10" y={7 + dy} width="3" height="1" fill={strokeColor} />
      <rect x="13" y={7 + dy} width="1" height="1" fill={fillColor} />
      {/* cara, angostándose hacia el mentón */}
      <rect x="4" y={8 + dy} width="10" height="1" fill={fillColor} />
      <rect x="5" y={9 + dy} width="8" height="1" fill={fillColor} />
      <rect x="6" y={10 + dy} width="6" height="1" fill={fillColor} />
    </svg>
  );
}
