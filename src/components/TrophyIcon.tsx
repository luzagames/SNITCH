export function TrophyIcon({ size = 16, color = '#FFE066' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={(size * 10) / 9} viewBox="0 0 9 10" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="1" y="0" width="7" height="1" fill={color} />
      <rect x="0" y="1" width="9" height="1" fill={color} />
      <rect x="0" y="2" width="9" height="1" fill={color} />
      <rect x="1" y="3" width="7" height="1" fill={color} />
      <rect x="2" y="4" width="5" height="1" fill={color} />
      <rect x="3" y="5" width="3" height="1" fill={color} />
      <rect x="3" y="6" width="3" height="1" fill={color} />
      <rect x="2" y="7" width="5" height="1" fill={color} />
      <rect x="1" y="8" width="7" height="1" fill={color} />
      <rect x="1" y="9" width="7" height="1" fill={color} />
    </svg>
  );
}
