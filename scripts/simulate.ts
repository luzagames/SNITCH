import { createGame, currentPlayer, resolveAsk, resolveKill, leaveGame } from '../src/game/rules';
import { fullCardSet } from '../src/game/deck';
import { questionLabel, validateQuestion } from '../src/game/askQuestions';
import type { AskQuestion, GameState } from '../src/game/types';

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log(...args);
}

function printState(state: GameState) {
  log(
    state.players
      .map((p) => `${p.name}: ${p.alive ? p.lives + '❤' : 'ELIMINADO'} (${p.hand.length} cartas)`)
      .join(' | ')
  );
}

function run() {
  const players = [
    { id: 'p1', name: 'Lolo' },
    { id: 'p2', name: 'Juan' },
    { id: 'p3', name: 'Martin' },
    { id: 'p4', name: 'Pedro' },
  ];

  const state = createGame(players);
  log('=== Reparto inicial ===');
  state.players.forEach((p) =>
    log(p.name, p.hand.map((c) => `${c.rank}-${c.suit}`).join(', '))
  );
  log('Empieza:', currentPlayer(state).name);
  printState(state);

  log('\n=== Prueba de las 6 preguntas de ASK ===');
  const testQuestions: AskQuestion[] = [
    { id: 'GREATER_THAN', value: 10 },
    { id: 'LOWER_THAN', value: 5 },
    { id: 'BETWEEN', min: 4, max: 9 },
    { id: 'OF_SUIT', suit: 'hearts' },
    { id: 'OF_VALUE', value: 7 },
    { id: 'REPEATED_VALUE_IN_HAND' },
  ];
  for (const q of testQuestions) {
    log(`  "${questionLabel(q)}"`);
  }

  log('\n=== Prueba de pregunta inválida (debe rechazarse) ===');
  try {
    validateQuestion({ id: 'BETWEEN', min: 9, max: 3 });
    log('  ERROR: debería haber lanzado excepción');
  } catch (e) {
    log('  OK, rechazada correctamente:', (e as Error).message);
  }

  const allCards = fullCardSet();
  let turns = 0;
  const MAX_TURNS = 500; // guard contra loops infinitos por bug

  while (state.status === 'playing' && turns < MAX_TURNS) {
    turns++;
    const actor = currentPlayer(state);

    // Estrategia ficticia simple para probar ambas acciones:
    // en turnos pares intenta ASK, en impares intenta KILL.
    if (turns % 2 === 0) {
      resolveAsk(state, actor.id, { id: 'GREATER_THAN', value: 10 });
    } else {
      const guess = allCards[Math.floor(Math.random() * allCards.length)];
      resolveKill(state, actor.id, guess);
    }

    if (turns % 5 === 0) {
      log(`--- turno ${turns} ---`);
      printState(state);
    }
  }

  log('\n=== FIN ===');
  log('Ganador:', state.players.find((p) => p.id === state.winnerId)?.name);
  log('Turnos jugados:', turns);
  printState(state);

  // Prueba adicional: abandono de partida
  log('\n=== Prueba de abandono (partida nueva) ===');
  const state2 = createGame(players);
  const someone = state2.players[1];
  leaveGame(state2, someone.id);
  log(`${someone.name} abandonó. Vivo:`, someone.alive, 'Cartas:', someone.hand.length);
  log(
    'Eventos de reveal generados:',
    state2.history.filter((h) => h.type === 'reveal').length
  );
}

run();
