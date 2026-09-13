import type { Suit } from '../game/types';

// Reemplaza los símbolos tipográficos (♠♥♦♣) en las cartas VISUALES, para
// que se sientan parte del mismo pixel art que el resto del juego. El
// texto de siempre (SUIT_SYMBOLS en game/display.ts) se sigue usando para
// aria-labels y mensajes — esto es solo lo que se dibuja en pantalla.
//
// Pica y trébol están en una grilla más grande (16x16) que corazón y
// diamante (9x9) — se remuestrearon directo de una imagen de referencia
// que pasaste (los dos intentos anteriores, dibujados/calculados a
// mano, no quedaron bien). El tamaño de grilla se toma de cada diseño
// puntual, no está fijo.
const GRIDS: Record<Suit, string[]> = {
  hearts: [
    '.##...##.',
    '#########',
    '#########',
    '#########',
    '.#######.',
    '..#####..',
    '...###...',
    '....#....',
    '.........',
  ],
  diamonds: [
    '....#....',
    '...###...',
    '..#####..',
    '.#######.',
    '#########',
    '.#######.',
    '..#####..',
    '...###...',
    '....#....',
  ],
  spades: [
    '.......##.......',
    '......####......',
    '....########....',
    '...##########...',
    '..############..',
    '.##############.',
    '################',
    '################',
    '################',
    '################',
    '################',
    '.##############.',
    '..###..##..###..',
    '......####......',
    '.....######.....',
    '.....######.....',
  ],
  clubs: [
    '......####......',
    '.....######.....',
    '....########....',
    '....########....',
    '....########....',
    '....########....',
    '..############..',
    '.##############.',
    '################',
    '################',
    '################',
    '################',
    '.#####.##.#####.',
    '......####......',
    '......####......',
    '.....######.....',
  ],
};

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

export function SuitIcon({ suit, color, size = 14 }: { suit: Suit; color: string; size?: number }) {
  const grid = GRIDS[suit];
  const gridSize = grid.length; // cada diseño es cuadrado (mismo ancho que alto)
  const rects = toRects(grid);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${gridSize} ${gridSize}`} shapeRendering="crispEdges" aria-hidden="true">
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={color} />
      ))}
    </svg>
  );
}
