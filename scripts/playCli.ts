import { createGame, currentPlayer, resolveAsk, resolveKill } from '../src/game/rules';
import { fullCardSet } from '../src/game/deck';
import { questionLabel } from '../src/game/askQuestions';
import { cardLabel, heartsLabel } from '../src/game/display';
import type { AskQuestion, Card, GameState, Rank, Suit } from '../src/game/types';

// Fuente de input abstraída: en producción usamos readline-sync (necesita
// una terminal real). Para poder testear la lógica de menús/parseo sin
// depender de un TTY, se puede inyectar una fuente falsa (ver test al final).
export interface InputSource {
  question(prompt: string): string;
}

class ReadlineSyncSource implements InputSource {
  private rls = require('readline-sync');
  question(prompt: string): string {
    return this.rls.question(prompt);
  }
}

// Fuente de prueba: consume respuestas de una lista fija, en orden.
// Útil para testear el flujo completo sin una terminal real.
export class QueueInputSource implements InputSource {
  private queue: string[];
  constructor(answers: string[]) {
    this.queue = [...answers];
  }
  question(prompt: string): string {
    const next = this.queue.shift();
    if (next === undefined) throw new Error('QueueInputSource: se acabaron las respuestas de prueba');
    console.log(prompt + next);
    return next;
  }
}

let input: InputSource = new ReadlineSyncSource();

async function ask(question: string): Promise<string> {
  return input.question(question).trim();
}

function printTable(state: GameState) {
  console.log('\n' + '='.repeat(50));
  for (const p of state.players) {
    const status = p.alive ? heartsLabel(p.lives) : 'ELIMINADO';
    const isTurn = state.status === 'playing' && currentPlayer(state).id === p.id ? ' <- TURNO' : '';
    console.log(`${p.name.padEnd(10)} ${status.padEnd(12)} ${p.hand.length} cartas${isTurn}`);
  }
  console.log('='.repeat(50));
}

function printOwnHand(state: GameState) {
  const p = currentPlayer(state);
  console.log(`\nTu mano (${p.name}): ${p.hand.map(cardLabel).join('  ')}`);
}

async function chooseKillCard(): Promise<Card> {
  const deck = fullCardSet();
  console.log('\nElegí una carta para KILL:');
  const indexed: { index: number; card: Card }[] = [];
  deck.forEach((c, i) => indexed.push({ index: i, card: c }));
  for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as Suit[]) {
    const row = indexed
      .filter((x) => x.card.kind === 'standard' && x.card.suit === suit)
      .map((x) => `[${x.index}] ${cardLabel(x.card)}`)
      .join(' ');
    console.log(row);
  }
  const jokerEntry = indexed.find((x) => x.card.kind === 'joker');
  if (jokerEntry) console.log(`[${jokerEntry.index}] JOKER`);
  while (true) {
    const answer = await ask('Número de carta: ');
    const idx = parseInt(answer, 10);
    if (!isNaN(idx) && idx >= 0 && idx < deck.length) {
      return deck[idx];
    }
    console.log('Número inválido, probá de nuevo.');
  }
}

const QUESTION_MENU: { id: AskQuestion['id']; label: string }[] = [
  { id: 'GREATER_THAN', label: 'Mayor que X' },
  { id: 'LOWER_THAN', label: 'Menor que X' },
  { id: 'BETWEEN', label: 'Entre X e Y' },
  { id: 'OF_SUIT', label: 'De palo X' },
  { id: 'OF_VALUE', label: 'De valor X' },
  { id: 'REPEATED_VALUE_IN_HAND', label: '¿Alguien tiene un valor repetido en su mano?' },
];

async function chooseAskQuestion(): Promise<AskQuestion> {
  console.log('\nElegí una pregunta:');
  QUESTION_MENU.forEach((q, i) => console.log(`[${i}] ${q.label}`));
  const answer = await ask('Número de pregunta: ');
  const idx = parseInt(answer, 10);
  const chosen = QUESTION_MENU[idx];
  if (!chosen) throw new Error('Opción inválida');

  switch (chosen.id) {
    case 'GREATER_THAN':
    case 'LOWER_THAN':
    case 'OF_VALUE': {
      const value = parseInt(await ask('Valor (1-13, A=1, J=11, Q=12, K=13): '), 10) as Rank;
      return { id: chosen.id, value };
    }
    case 'BETWEEN': {
      const min = parseInt(await ask('Mínimo: '), 10) as Rank;
      const max = parseInt(await ask('Máximo: '), 10) as Rank;
      return { id: 'BETWEEN', min, max };
    }
    case 'OF_SUIT': {
      const suit = (await ask('Palo (spades/hearts/diamonds/clubs): ')) as Suit;
      return { id: 'OF_SUIT', suit };
    }
    case 'REPEATED_VALUE_IN_HAND':
      return { id: 'REPEATED_VALUE_IN_HAND' };
  }
}

async function playTurn(state: GameState) {
  printTable(state);
  printOwnHand(state);

  const historyBefore = state.history.length;
  const action = await ask('\n¿KILL o ASK? (k/a): ');

  if (action.toLowerCase().startsWith('k')) {
    const card = await chooseKillCard();
    const result = resolveKill(state, currentPlayer(state).id, card);
    if (result.selfBluff) {
      console.log(`🎭 Bluffeaste con tu propia carta (${cardLabel(card)}). Perdiste 1 corazón, pero la conservás.`);
    } else if (result.hit) {
      console.log(`✔ ¡Impacto! ${result.hitPlayerId} tenía ${cardLabel(card)}.`);
    } else {
      console.log(`✘ Nadie tenía ${cardLabel(card)}. Perdiste 1 corazón.`);
    }
    printNewHistory(state, historyBefore);
  } else {
    const question = await chooseAskQuestion();
    const askerId = currentPlayer(state).id;
    const result = resolveAsk(state, askerId, question);
    console.log(`\n"${questionLabel(question)}"`);
    for (const a of result.answers) {
      console.log(`  ${a.playerId}: ${a.matches ? '✓' : 'X'}`);
    }
    if (!result.anyMatch) {
      console.log('Nadie respondió ✓. Perdiste 1 corazón.');
    }
    printNewHistory(state, historyBefore);
  }
}

function printNewHistory(state: GameState, fromIndex: number) {
  for (const event of state.history.slice(fromIndex)) {
    if (event.type === 'reveal') {
      console.log(
        `[TEASE] La carta de ${event.result.playerId} era ${cardLabel(event.result.card)} (se descarta)`
      );
    }
    if (event.type === 'eliminated') {
      console.log(`[ELIMINADO] ${event.playerId} quedó fuera de la partida.`);
    }
  }
}

export async function main(customInput?: InputSource) {
  if (customInput) input = customInput;
  console.log('=== SNITCH — CLI de prueba (Fase 1) ===\n');
  const countStr = await ask('¿Cuántos jugadores (2-6)? ');
  const count = Math.min(6, Math.max(2, parseInt(countStr, 10) || 4));

  const players: { id: string; name: string }[] = [];
  for (let i = 0; i < count; i++) {
    const name = (await ask(`Nombre del jugador ${i + 1}: `)) || `Player${i + 1}`;
    players.push({ id: `p${i + 1}`, name });
  }

  const state = createGame(players);
  console.log(`\nEmpieza: ${currentPlayer(state).name}`);

  while (state.status === 'playing') {
    await playTurn(state);
  }

  printTable(state);
  const winner = state.players.find((p) => p.id === state.winnerId);
  console.log(`\n🏆 GANADOR: ${winner?.name}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('ERROR:', err);
    process.exit(1);
  });
}
