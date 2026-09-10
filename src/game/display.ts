import { RANK_LABELS, SUIT_LABELS } from './askQuestions';
import { STARTING_LIVES } from './rules';
import type { Card, Suit } from './types';

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

// Como en los naipes de verdad: corazones y diamantes son rojos, picas y
// tréboles son negros.
export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

// Ej: "10♥", "A♠", "K♦", "JOKER" — formato compacto, usado en cartas/botones.
export function cardLabel(card: Card): string {
  if (card.kind === 'joker') return 'JOKER';
  return `${RANK_LABELS[card.rank]}${SUIT_SYMBOLS[card.suit]}`;
}

// Ej: "A de Picas", "10 de Corazones", "el Joker" — formato largo, usado en
// los mensajes de la partida para que se lean como texto natural.
export function cardLabelLong(card: Card): string {
  if (card.kind === 'joker') return 'el Joker';
  return `${RANK_LABELS[card.rank]} de ${SUIT_LABELS[card.suit]}`;
}

export function heartsLabel(lives: number): string {
  return '❤'.repeat(Math.max(lives, 0)) + '·'.repeat(Math.max(STARTING_LIVES - lives, 0));
}
