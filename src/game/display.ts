import { RANK_LABELS } from './askQuestions';
import type { Card, Suit } from './types';

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

// Ej: "10♥", "A♠", "K♦"
export function cardLabel(card: Card): string {
  return `${RANK_LABELS[card.rank]}${SUIT_SYMBOLS[card.suit]}`;
}

export function heartsLabel(lives: number): string {
  return '❤'.repeat(Math.max(lives, 0)) + '·'.repeat(Math.max(5 - lives, 0));
}
