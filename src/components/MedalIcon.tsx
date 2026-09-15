const MEDAL_GRID = [
  '..RR.....RR..',
  '...RR...RR...',
  '....RR.RR....',
  '.....RRR.....',
  '.....###.....',
  '....#####....',
  '...#######...',
  '..#########..',
  '..#########..',
  '..#########..',
  '..#########..',
  '...#######...',
  '....#####....',
  '.....###.....',
];

const MEDAL_COLORS: Record<1 | 2 | 3, { body: string; ribbon: string }> = {
  1: { body: '#FFD700', ribbon: '#e8291c' },
  2: { body: '#C0C0C0', ribbon: '#4a90d9' },
  3: { body: '#CD7F32', ribbon: '#3a9b3a' },
};

function toRects(grid: string[]): { x: number; y: number; w: number; c: string }[] {
  const rects: { x: number; y: number; w: number; c: string }[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === '.') {
        x++;
        continue;
      }
      const start = x;
      while (x < row.length && row[x] === c) x++;
      rects.push({ x: start, y, w: x - start, c });
    }
  });
  return rects;
}

// Medalla para el top 3 de un ranking (1ro oro, 2do plata, 3ro bronce),
// inspirada en la referencia que pasaste — cinta arriba, cuerpo circular
// abajo, mismo estilo de rects fusionados que el resto de los íconos.
export function MedalIcon({ place, size = 16 }: { place: 1 | 2 | 3; size?: number }) {
  const { body, ribbon } = MEDAL_COLORS[place];
  const rects = toRects(MEDAL_GRID);
  return (
    <svg width={size} height={(size * 15) / 13} viewBox="0 0 13 15" shapeRendering="crispEdges" aria-label={`Medalla de puesto ${place}`}>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c === 'R' ? ribbon : body} />
      ))}
    </svg>
  );
}
