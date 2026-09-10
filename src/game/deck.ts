import type { Card, Rank, Suit } from './types';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// Devuelve las 52 cartas posibles del juego. Se usa tanto para armar
// el mazo a repartir como para la UI de selección de KILL (que siempre
// muestra las 52, sin importar qué se repartió realmente).
export function fullCardSet(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ suit, rank });
    }
  }
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

// Reparte 3 cartas a cada uno de los playerIds, en orden.
// Devuelve un mapa playerId -> mano, y el resto del mazo (que en SNITCH
// no se vuelve a usar, según lo definido).
export function dealHands(
  playerIds: string[],
  cardsPerPlayer = 3
): Record<string, Card[]> {
  const deck = shuffleDeck(fullCardSet());
  const hands: Record<string, Card[]> = {};

  let cursor = 0;
  for (const id of playerIds) {
    hands[id] = deck.slice(cursor, cursor + cardsPerPlayer);
    cursor += cardsPerPlayer;
  }
  return hands;
}
