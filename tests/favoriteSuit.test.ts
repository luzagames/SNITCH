import { computeFavoriteSuit } from '../src/game/deck';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FALLÓ: ' + msg);
  console.log('OK:', msg);
}

// --- Sin historial suficiente: null, aunque haya un "ganador" aparente ---
{
  const result = computeFavoriteSuit({ spades: 3, hearts: 2, diamonds: 1, clubs: 0 }); // total 6, menos de 9
  assert(result === null, 'Con menos de 9 cartas de historial, no hay favorito todavía (null)');
}

// --- Historial suficiente, un favorito claro ---
{
  const result = computeFavoriteSuit({ spades: 6, hearts: 2, diamonds: 1, clubs: 1 }); // total 10
  assert(result === 'spades', 'Con un palo claramente por encima del resto, ese es el favorito');
}

// --- Empate entre dos palos: null (no hay un favorito CLARO) ---
{
  const result = computeFavoriteSuit({ spades: 5, hearts: 5, diamonds: 0, clubs: 0 }); // total 10, empate
  assert(result === null, 'Empate entre dos palos: no hay favorito claro (null)');
}

// --- Empate entre los 4 (todos iguales): null ---
{
  const result = computeFavoriteSuit({ spades: 3, hearts: 3, diamonds: 3, clubs: 3 }); // total 12
  assert(result === null, 'Los 4 palos parejos: no hay favorito (null)');
}

// --- Justo en el umbral (9): ya cuenta ---
{
  const result = computeFavoriteSuit({ spades: 9, hearts: 0, diamonds: 0, clubs: 0 });
  assert(result === 'spades', 'Justo en el umbral de 9 cartas: ya se considera favorito');
}

console.log('\nTodos los tests de mano favorita pasaron correctamente.');
