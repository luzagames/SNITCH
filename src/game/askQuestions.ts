import type { AskQuestion, Rank, Suit } from './types';

// Etiquetas de display para rank y suit, usadas en textos de historial/UI.
export const RANK_LABELS: Record<Rank, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

export const SUIT_LABELS: Record<Suit, string> = {
  spades: 'Spades',
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
};

// Lanza un error descriptivo si la pregunta está mal formada. Se llama
// siempre antes de resolver un ASK, tanto en el cliente (feedback rápido)
// como del lado server-authoritative (Cloud Function) para no confiar
// nunca en que el cliente mandó algo válido.
export function validateQuestion(q: AskQuestion): void {
  switch (q.id) {
    case 'GREATER_THAN':
    case 'LOWER_THAN':
    case 'OF_VALUE':
      if (q.value === undefined) {
        throw new Error(`La pregunta ${q.id} requiere un valor (value)`);
      }
      break;
    case 'BETWEEN':
      if (q.min === undefined || q.max === undefined) {
        throw new Error('La pregunta BETWEEN requiere min y max');
      }
      if (q.min > q.max) {
        throw new Error('En BETWEEN, min no puede ser mayor que max');
      }
      break;
    case 'OF_SUIT':
      if (q.suit === undefined) {
        throw new Error('La pregunta OF_SUIT requiere un palo (suit)');
      }
      break;
    case 'REPEATED_VALUE_IN_HAND':
      // No requiere parámetros.
      break;
    default:
      throw new Error(`Tipo de pregunta desconocido: ${q.id}`);
  }
}

// Texto legible para historial y para el botón de la UI.
// Ej: "Does anyone have a card greater than 10?"
export function questionLabel(q: AskQuestion): string {
  switch (q.id) {
    case 'GREATER_THAN':
      return `Does anyone have a card greater than ${RANK_LABELS[q.value as Rank]}?`;
    case 'LOWER_THAN':
      return `Does anyone have a card lower than ${RANK_LABELS[q.value as Rank]}?`;
    case 'BETWEEN':
      return `Does anyone have a card between ${RANK_LABELS[q.min as Rank]} and ${RANK_LABELS[q.max as Rank]}?`;
    case 'OF_SUIT':
      return `Does anyone have a card of suit ${SUIT_LABELS[q.suit as Suit]}?`;
    case 'OF_VALUE':
      return `Does anyone have a card of value ${RANK_LABELS[q.value as Rank]}?`;
    case 'REPEATED_VALUE_IN_HAND':
      return 'Did anyone have a repeated card?';
    default:
      return 'Unknown question';
  }
}
