const CHECK_GRID = [
  '.......#',
  '......##',
  '.....##.',
  '.....##.',
  '##..##..',
  '#####...',
  '.###....',
  '..#.....',
];

const CROSS_GRID = [
  '##.....#',
  '###...##',
  '.###.##.',
  '..####..',
  '...###..',
  '..#####.',
  '.##..###',
  '##....##',
];

function toRects(grid: string[]): { x: number; y: number; w: number }[] {
  const rects: { x: number; y: number; w: number }[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== '#') {
        x++;
        continue;
      }
      const start = x;
      while (x < row.length && row[x] === '#') x++;
      rects.push({ x: start, y, w: x - start });
    }
  });
  return rects;
}

// Reemplazan a los ✓/✗ tipográficos en las respuestas de PREGUNTAR, para
// que se sientan parte del mismo pixel art que el resto del juego.
export function MatchIcon({ matches, size = 14 }: { matches: boolean; size?: number }) {
  const grid = matches ? CHECK_GRID : CROSS_GRID;
  const color = matches ? '#3CB043' : 'var(--snitch-accent)';
  const rects = toRects(grid);
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-label={matches ? 'Sí' : 'No'}>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={color} />
      ))}
    </svg>
  );
}
