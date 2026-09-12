// Ícono de gema pixelada — reconstruido a partir del sprite que armaste
// (grilla de 18x11, misma técnica que Avatar.tsx: rectángulos SVG en vez
// de una imagen externa). Recibe dos tonos (claro/oscuro, las dos "caras"
// de la gema) para poder recolorearla según el rango.
export function RankGemIcon({
  light,
  dark,
  size = 18,
}: {
  light: string;
  dark: string;
  size?: number;
}) {
  return (
    <svg width={size} height={(size * 11) / 18} viewBox="0 0 18 11" shapeRendering="crispEdges" role="img" aria-hidden="true">
      <rect x="5" y="0" width="8" height="1" fill={light} />
      <rect x="4" y="1" width="10" height="1" fill={light} />
      <rect x="4" y="2" width="10" height="1" fill={light} />
      <rect x="4" y="3" width="10" height="1" fill={dark} />
      <rect x="4" y="4" width="10" height="1" fill={dark} />
      <rect x="0" y="5" width="18" height="1" fill={light} />
      <rect x="4" y="6" width="10" height="1" fill={light} />
      <rect x="4" y="7" width="1" height="1" fill={dark} />
      <rect x="5" y="7" width="3" height="1" fill={light} />
      <rect x="8" y="7" width="2" height="1" fill={dark} />
      <rect x="10" y="7" width="3" height="1" fill={light} />
      <rect x="13" y="7" width="1" height="1" fill={dark} />
      <rect x="4" y="8" width="10" height="1" fill={dark} />
      <rect x="5" y="9" width="8" height="1" fill={dark} />
      <rect x="6" y="10" width="6" height="1" fill={dark} />
    </svg>
  );
}
