import type { Card, Rank, Suit } from './types';

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
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

export interface HandAnalysis {
  hadTriple: boolean; // las 3 cartas comparten número (ej: "Pierna")
  hadPair: boolean; // EXACTAMENTE 2 de las 3 comparten número (no las 3 — eso ya es hadTriple, no par)
  hadRepeatedValue: boolean; // al menos 2 comparten número (hadPair O hadTriple) — la usa la pregunta "tiene o tuvo"
  hadTwoJokers: boolean;
  isStraight: boolean; // 3 cartas estándar con números consecutivos (sin importar el palo)
  isStraightFlush: boolean; // escalera + mismo palo
  isRoyalStraightFlush: boolean; // específicamente A, K y Q del mismo palo (no es una "escalera" numérica común, por eso es un chequeo aparte)
  isTripleSixes: boolean; // la Pierna específica de "El Diablo": 3 seises
  isFlush: boolean; // las 3 cartas del mismo palo, SIN importar el número (a diferencia de isStraightFlush, que además exige que sean consecutivas)
  hasSixSeven: boolean; // tiene un 6 Y un 7 en la mano (sin importar el palo, ni la 3ra carta)
}

// Analiza una mano de 3 cartas (o menos/con Joker) y devuelve todos los
// patrones que nos importan para preguntas de ASK y logros — lógica pura,
// sin depender de Firebase, para poder testearla aislada.
export function analyzeHand(hand: Card[]): HandAnalysis {
  const jokerCount = hand.filter((c) => c.kind === 'joker').length;
  const standardCards = hand.filter((c): c is Extract<Card, { kind: 'standard' }> => c.kind === 'standard');
  const ranks = standardCards.map((c) => c.rank);
  const suits = standardCards.map((c) => c.suit);

  const hadTriple = hand.length === 3 && ranks.length === 3 && new Set(ranks).size === 1;
  const hadRepeatedValue = new Set(ranks).size < ranks.length;
  const hadPair = hadRepeatedValue && !hadTriple;
  const hadTwoJokers = jokerCount >= 2;

  let isStraight = false;
  let isStraightFlush = false;
  let isRoyalStraightFlush = false;
  let isFlush = false;
  if (ranks.length === 3) {
    const sortedRanks = [...ranks].sort((a, b) => a - b);
    isStraight = sortedRanks[1] === sortedRanks[0] + 1 && sortedRanks[2] === sortedRanks[1] + 1;
    isFlush = new Set(suits).size === 1;
    isStraightFlush = isStraight && isFlush;

    const rankSet = new Set(ranks);
    isRoyalStraightFlush = isFlush && rankSet.has(1) && rankSet.has(12) && rankSet.has(13);
  }

  const isTripleSixes = hadTriple && ranks.every((r) => r === 6);
  const hasSixSeven = ranks.includes(6) && ranks.includes(7);

  return {
    hadTriple,
    hadPair,
    hadRepeatedValue,
    hadTwoJokers,
    isStraight,
    isStraightFlush,
    isRoyalStraightFlush,
    isTripleSixes,
    isFlush,
    hasSixSeven,
  };
}
