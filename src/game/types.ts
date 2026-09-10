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

export interface Card {
  suit: Suit;
  rank: Rank;
}

// Identificador único y estable de una carta dentro del mazo de 52.
// Nos sirve para comparar cartas sin tener que comparar objetos.
export function cardId(card: Card): string {
  return `${card.suit}-${card.rank}`;
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
  | 'REPEATED_VALUE_IN_HAND';

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
  // Historial simple de acciones (base para el punto 21: historial/replay)
  history: (
    | { type: 'kill'; result: KillResult }
    | { type: 'ask'; result: AskResult }
    | { type: 'pass'; playerId: string }
    | { type: 'reveal'; result: CardRevealEvent }
    | { type: 'eliminated'; playerId: string }
  )[];
}
