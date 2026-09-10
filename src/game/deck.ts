import type { Card, Rank, Suit } from './types';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// Universo de cartas "seleccionables": las 52 estándar + 1 Joker
// representativo. Se usa para la UI (el jugador elige entre "tipos" de
// carta, no entre copias físicas — no existe un botón "Joker #1" separado
// de "Joker #2", solo "Joker").
export function fullCardSet(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ kind: 'standard', suit, rank });
    }
  }
  cards.push({ kind: 'joker' });
  return cards;
}

// El mazo físico real que se baraja y reparte: 52 estándar + 2 Jokers
// (54 cartas en total). A diferencia de fullCardSet(), acá los 2 Jokers
// son entradas separadas porque sí importa que puedan repartirse por
// separado (a la misma mano o a manos distintas).
function physicalDeck(): Card[] {
  const standardCards = fullCardSet().filter(
    (c): c is Extract<Card, { kind: 'standard' }> => c.kind === 'standard'
  );
  const cards: Card[] = [...standardCards, { kind: 'joker' }, { kind: 'joker' }];
  return cards;
}

// Fisher-Yates shuffle. Importante: en producción, este shuffle debe
// ejecutarse del lado del servidor (Cloud Function), nunca en el cliente,
// para que nadie pueda predecir o forzar el orden del mazo.
export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Reparte 3 cartas a cada uno de los playerIds, en orden, desde el mazo
// físico de 54 cartas (con los 2 Jokers incluidos).
export function dealHands(
  playerIds: string[],
  cardsPerPlayer = 3
): Record<string, Card[]> {
  const deck = shuffleDeck(physicalDeck());
  const hands: Record<string, Card[]> = {};

  let cursor = 0;
  for (const id of playerIds) {
    hands[id] = deck.slice(cursor, cursor + cardsPerPlayer);
    cursor += cardsPerPlayer;
  }
  return hands;
}
