// ============================================================
// TIPOS BASE DEL JUEGO SNITCH
// Esta capa no sabe nada de React ni de Firebase.
// Es pura lógica de dominio: si esto está bien, el resto se apoya
// encima sin duplicar reglas.
// ============================================================

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

// Valor numérico real de la carta (para comparaciones en ASK y KILL).
// As = 1, J = 11, Q = 12, K = 13 (según lo definido).
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

// El Joker no tiene palo ni número — por eso Card es un tipo discriminado
// en vez de {suit, rank} siempre. Cualquier código que compare/muestre una
// carta tiene que manejar los dos casos explícitamente.
export interface StandardCard {
  kind: 'standard';
  suit: Suit;
  rank: Rank;
}

export interface JokerCard {
  kind: 'joker';
}

export type Card = StandardCard | JokerCard;

// Identificador único y estable de una carta (para comparar sin comparar
// objetos). Los dos Jokers del mazo comparten el mismo id a propósito: son
// indistinguibles entre sí, así que "tener un Joker" es una sola condición,
// no dos.
export function cardId(card: Card): string {
  return card.kind === 'joker' ? 'joker' : `${card.suit}-${card.rank}`;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[]; // cartas actuales en mano (boca abajo para los demás)
  lives: number; // arranca en 5
  alive: boolean;
  isSpectator: boolean; // true cuando quedó eliminado y decide observar
}

export type ActionType = 'kill' | 'ask';

// Preguntas predefinidas de ASK. Cada una es una función pura que,
// dado un jugador, determina si cumple la condición (true = ✓, false = X).
// Esto es lo que permite que el sistema calcule automáticamente las
// respuestas sin que nadie escriba texto libre.
export type AskQuestionId =
  | 'GREATER_THAN'
  | 'LOWER_THAN'
  | 'BETWEEN'
  | 'OF_SUIT'
  | 'OF_VALUE'
  | 'REPEATED_VALUE_IN_HAND'
  | 'BETWEEN_OF_SUIT';

export interface AskQuestion {
  id: AskQuestionId;
  // Parámetros de la pregunta. No todas las preguntas usan todos los campos.
  value?: Rank;
  min?: Rank;
  max?: Rank;
  suit?: Suit;
}

export interface AskResult {
  question: AskQuestion;
  askerId: string;
  // Respuesta por jugador (excluye al que preguntó).
  answers: { playerId: string; matches: boolean }[];
  anyMatch: boolean;
  heartLost: boolean; // true si nadie tuvo ✓ y el asker perdió 1 vida
}

export interface KillResult {
  killerId: string;
  targetCard: Card;
  hit: boolean; // true si alguien tenía la carta
  // Si hit=true, quién la tenía y si eso lo eliminó
  hitPlayerId?: string;
  eliminatedPlayer: boolean;
  heartLost: boolean; // true si hit=false (falló) o si fue un bluff sobre la propia carta
  selfBluff?: boolean; // true si el killer targeteó una carta de su propia mano
}

// Evento de "tease": una carta se muestra brevemente a toda la mesa
// antes de desaparecer del juego (por KILL exitoso o por abandono).
export interface CardRevealEvent {
  playerId: string;
  card: Card;
  reason: 'kill' | 'left_game';
}

export type GameStatus = 'lobby' | 'playing' | 'finished';

export interface GameState {
  status: GameStatus;
  players: Player[]; // orden = orden de turno (sentido horario)
  currentTurnIndex: number; // índice dentro de players[] de quien juega ahora
  winnerId?: string;
  // Orden en que fueron quedando ELIMINADOS (no incluye al ganador). El
  // primero de esta lista fue el primero en caer; el último, el
  // penúltimo en pie. Se usa para reconstruir el resultado final completo
  // (1ro, 2do, 3ro...) para el sistema de rating.
  eliminationOrder: string[];
  // Historial simple de acciones (base para el punto 21: historial/replay)
  history: (
    | { type: 'kill'; result: KillResult }
    | { type: 'ask'; result: AskResult }
    | { type: 'pass'; playerId: string }
    | { type: 'reveal'; result: CardRevealEvent }
    | { type: 'eliminated'; playerId: string }
  )[];
}
