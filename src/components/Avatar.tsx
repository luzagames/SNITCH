import { useId } from 'react';
import { getHeadDesign } from '../game/heads';

interface AvatarProps {
  alive: boolean;
  size?: number;
  className?: string;
  // Brillo alrededor del contorno real (no un cuadrado) — a diferencia
  // del brillo pulsante del turno (que usa CSS filter:drop-shadow), este
  // usa un <filter> SVG nativo, para que se capture bien en imágenes
  // exportadas con html2canvas (la tarjeta de victoria compartible), que
  // no siempre soporta filtros CSS aplicados desde afuera.
  glow?: boolean;
  glowColor?: string;
  // Si se pasa, el avatar se pinta con ESTOS colores en vez de las
  // variables CSS del skin activo — así se puede mostrar a cada jugador
  // de la mesa con el skin que ELLOS eligieron, sin importar cuál esté
  // aplicado en tu propia pantalla. El estado "eliminado" (gris) se
  // mantiene igual pase lo que pase, porque es información del estado
  // del juego, no una preferencia de estilo.
  palette?: { stroke: string; fill: string };
  // Cuál gorro coleccionable mostrar — 'original' (o sin especificar) es
  // el detective de siempre, que sigue recoloreándose con el skin activo
  // (palette/CSS vars, como toda la vida). Los demás gorros tienen
  // colores FIJOS propios (ver game/heads.ts) — no cambian con el skin,
  // porque son diseños con identidad propia, no un molde recoloreable.
  headId?: string;
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
export function Avatar({ alive, size = 72, className, glow = false, glowColor = 'var(--snitch-accent)', palette, headId = 'original' }: AvatarProps) {
  const isCollectibleHead = headId !== 'original';
  const head = isCollectibleHead ? getHeadDesign(headId) : null;

  // El detective original se recolorea con el skin activo, como siempre.
  // Los gorros coleccionables usan sus propios colores fijos (cara crema
  // y anteojos negros siempre, sea cual sea el skin) — así "la cara de
  // abajo" es consistente entre los 9 diseños, y lo único que cambia es
  // el gorro de arriba.
  const strokeColor = !alive ? 'var(--snitch-muted)' : head ? head.hatColor : palette?.stroke ?? 'var(--snitch-accent)';
  const bandColor = !alive ? 'var(--snitch-muted)' : head ? head.bandColor : strokeColor;
  const fillColor = !alive ? '#2a2a2a' : head ? '#f5f5f0' : palette?.fill ?? 'var(--snitch-avatar-fill)';
  const foreheadColor = !alive ? '#2a2a2a' : head ? head.foreheadColor ?? '#f5f5f0' : fillColor;
  const glassesColor = !alive ? 'var(--snitch-muted)' : head ? '#000000' : strokeColor;
  const dy = 3; // filas de relleno arriba, antes de empezar a dibujar
  const filterId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      shapeRendering="crispEdges"
      role="img"
      aria-label={alive ? 'Jugador' : 'Jugador eliminado'}
      className={className}
      overflow="visible"
    >
      {glow && (
        <defs>
          <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor={glowColor} floodOpacity="0.9" />
          </filter>
        </defs>
      )}
      <g filter={glow ? `url(#${filterId})` : undefined}>
        {!alive && head?.customRects ? (
          // Eliminado + diseño custom: en vez de tratar de "engrisar" cada
          // rect uno por uno (perdiendo la forma), mostramos la silueta
          // entera en gris parejo — más simple y se entiende igual de bien
          // que "este jugador ya no está".
          head.customRects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill="var(--snitch-muted)" />)
        ) : head?.customRects ? (
          head.customRects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.color} />)
        ) : (
          <>
            {/* sombrero: copa */}
            <rect x="5" y={0 + dy} width="8" height="1" fill={strokeColor} />
            <rect x="4" y={1 + dy} width="10" height="1" fill={strokeColor} />
            <rect x="4" y={2 + dy} width="10" height="1" fill={strokeColor} />
            {/* frente, visible debajo de la copa */}
            <rect x="4" y={3 + dy} width="10" height="1" fill={foreheadColor} />
            <rect x="4" y={4 + dy} width="10" height="1" fill={foreheadColor} />
            {/* sombrero: ala (todo el ancho) */}
            <rect x="0" y={5 + dy} width="18" height="1" fill={strokeColor} />
            {/* banda del sombrero */}
            <rect x="4" y={6 + dy} width="10" height="1" fill={bandColor} />
            {/* anteojos */}
            <rect x="4" y={7 + dy} width="1" height="1" fill={fillColor} />
            <rect x="5" y={7 + dy} width="3" height="1" fill={glassesColor} />
            <rect x="8" y={7 + dy} width="2" height="1" fill={fillColor} />
            <rect x="10" y={7 + dy} width="3" height="1" fill={glassesColor} />
            <rect x="13" y={7 + dy} width="1" height="1" fill={fillColor} />
            {/* cara, angostándose hacia el mentón */}
            <rect x="4" y={8 + dy} width="10" height="1" fill={fillColor} />
            <rect x="5" y={9 + dy} width="8" height="1" fill={fillColor} />
            <rect x="6" y={10 + dy} width="6" height="1" fill={fillColor} />
          </>
        )}
      </g>
    </svg>
  );
}
