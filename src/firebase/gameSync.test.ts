import { applyPendingAction } from './gameSyncLogic';
import type { SyncedGameState } from './gameSyncLogic';
import type { Card } from '../game/types';

function baseGs(overrides: Partial<SyncedGameState> = {}): SyncedGameState {
  return {
    status: 'playing',
    turnOrder: ['p1', 'p2'],
    currentTurnIndex: 0,
    playersPublic: {
      p1: { name: 'Lolo', lives: 4, alive: true, handCount: 3 },
      p2: { name: 'Juan', lives: 4, alive: true, handCount: 3 },
    },
    winnerId: null,
    lastMessage: '',
    lastAnswers: null,
    pendingAction: null,
    ...overrides,
  };
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FALLÓ: ' + msg);
  console.log('OK:', msg);
}

// --- Escenario 1: KILL exitoso -> el killer se cura 1 vida ---
{
  const target: Card = { suit: 'hearts', rank: 7 };
  const hands = {
    p1: [{ suit: 'spades', rank: 1 } as Card, { suit: 'clubs', rank: 2 } as Card, { suit: 'diamonds', rank: 3 } as Card],
    p2: [target, { suit: 'clubs', rank: 9 } as Card, { suit: 'diamonds', rank: 10 } as Card],
  };
  const gs = baseGs({
    playersPublic: {
      p1: { name: 'Lolo', lives: 2, alive: true, handCount: 3 }, // arranca con 2 de 4
      p2: { name: 'Juan', lives: 4, alive: true, handCount: 3 },
    },
    pendingAction: { type: 'kill', actorId: 'p1', card: target },
  });
  const { newState, changedHands } = applyPendingAction(gs, hands);

  assert(newState.playersPublic.p2.handCount === 2, 'KILL exitoso: p2 pierde 1 carta (queda con 2)');
  assert(newState.playersPublic.p1.lives === 3, 'KILL exitoso: el killer se cura 1 vida (2 -> 3)');
  assert(!!changedHands.p2, 'KILL exitoso: la mano de p2 se marca como cambiada');
  assert(newState.currentTurnIndex === 1, 'KILL exitoso: pasa el turno a p2');
  assert(
    newState.lastMessage === '¡Impacto! Lolo descubrió que Juan tenía el 7♥.',
    'KILL exitoso: el mensaje dice quién le acertó a quién'
  );
}

// --- Escenario 1b: la curación no puede superar el máximo (4) ---
{
  const target: Card = { suit: 'hearts', rank: 7 };
  const hands = {
    p1: [{ suit: 'spades', rank: 1 } as Card, { suit: 'clubs', rank: 2 } as Card, { suit: 'diamonds', rank: 3 } as Card],
    p2: [target, { suit: 'clubs', rank: 9 } as Card, { suit: 'diamonds', rank: 10 } as Card],
  };
  const gs = baseGs({ pendingAction: { type: 'kill', actorId: 'p1', card: target } }); // p1 ya arranca con 4 (máximo)
  const { newState } = applyPendingAction(gs, hands);

  assert(newState.playersPublic.p1.lives === 4, 'Curación con tope: no supera el máximo de 4 vidas');
}

// --- Escenario 2: KILL fallido (nadie tiene la carta) ---
{
  const target: Card = { suit: 'hearts', rank: 13 };
  const hands = {
    p1: [{ suit: 'spades', rank: 1 } as Card, { suit: 'clubs', rank: 2 } as Card, { suit: 'diamonds', rank: 3 } as Card],
    p2: [{ suit: 'clubs', rank: 9 } as Card, { suit: 'diamonds', rank: 10 } as Card, { suit: 'spades', rank: 5 } as Card],
  };
  const gs = baseGs({ pendingAction: { type: 'kill', actorId: 'p1', card: target } });
  const { newState, changedHands } = applyPendingAction(gs, hands);

  assert(newState.playersPublic.p1.lives === 3, 'KILL fallido: el killer pierde 1 vida (4 -> 3)');
  assert(Object.keys(changedHands).length === 0, 'KILL fallido: ninguna mano cambia');
}

// --- Escenario 3: bluff sobre la propia carta ---
{
  const ownCard: Card = { suit: 'diamonds', rank: 4 };
  const hands = {
    p1: [ownCard, { suit: 'clubs', rank: 2 } as Card, { suit: 'diamonds', rank: 3 } as Card],
    p2: [{ suit: 'clubs', rank: 9 } as Card, { suit: 'diamonds', rank: 10 } as Card, { suit: 'spades', rank: 5 } as Card],
  };
  const gs = baseGs({ pendingAction: { type: 'kill', actorId: 'p1', card: ownCard } });
  const { newState, changedHands } = applyPendingAction(gs, hands);

  assert(newState.playersPublic.p1.lives === 3, 'Bluff: pierde 1 vida (4 -> 3)');
  assert(newState.playersPublic.p1.handCount === 3, 'Bluff: conserva las 3 cartas');
  assert(Object.keys(changedHands).length === 0, 'Bluff: ninguna mano cambia');
  assert(!newState.lastMessage.toLowerCase().includes('bluff'), 'Bluff: el mensaje NO debe delatar que fue un bluff');
  assert(
    newState.lastMessage === 'Nadie tenía 4♦. Lolo perdió 1 corazón.',
    'Bluff: el mensaje es IDÉNTICO al de un fallo real (no distinguible)'
  );
}

// --- Escenario 4: ASK ya NO penaliza, aunque nadie responda ✓ ---
{
  const hands = {
    p1: [{ suit: 'spades', rank: 1 } as Card],
    p2: [{ suit: 'clubs', rank: 2 } as Card],
  };
  const gs = baseGs({
    playersPublic: {
      p1: { name: 'Lolo', lives: 4, alive: true, handCount: 1 },
      p2: { name: 'Juan', lives: 4, alive: true, handCount: 1 },
    },
    pendingAction: { type: 'ask', actorId: 'p1', question: { id: 'OF_VALUE', value: 13 } },
  });
  const { newState } = applyPendingAction(gs, hands);

  assert(newState.playersPublic.p1.lives === 4, 'ASK sin match: YA NO pierde vida (regla nueva)');
  assert(newState.lastAnswers?.length === 1 && newState.lastAnswers[0].matches === false, 'ASK sin match: respuesta X registrada');
}

// --- Escenario 5: PASAR el turno ---
{
  const hands = {
    p1: [{ suit: 'spades', rank: 1 } as Card],
    p2: [{ suit: 'clubs', rank: 2 } as Card],
  };
  const gs = baseGs({ pendingAction: { type: 'pass', actorId: 'p1' } });
  const { newState, changedHands } = applyPendingAction(gs, hands);

  assert(newState.playersPublic.p1.lives === 4, 'PASAR: no cambia vidas');
  assert(newState.playersPublic.p1.handCount === 1, 'PASAR: no cambia cartas');
  assert(Object.keys(changedHands).length === 0, 'PASAR: ninguna mano cambia');
  assert(newState.currentTurnIndex === 1, 'PASAR: pasa el turno al siguiente');
  assert(newState.lastMessage === 'Lolo pasó su turno.', 'PASAR: mensaje correcto');
}

// --- Escenario 6: eliminación por vidas dispara victoria (con las nuevas reglas) ---
{
  const hands = { p1: [{ suit: 'spades', rank: 1 } as Card], p2: [{ suit: 'clubs', rank: 2 } as Card] };
  const gs = baseGs({
    playersPublic: {
      p1: { name: 'Lolo', lives: 4, alive: true, handCount: 1 },
      p2: { name: 'Juan', lives: 1, alive: true, handCount: 1 },
    },
    currentTurnIndex: 1,
    pendingAction: { type: 'kill', actorId: 'p2', card: { suit: 'hearts', rank: 13 } },
  });
  const { newState } = applyPendingAction(gs, hands);

  assert(newState.playersPublic.p2.alive === false, 'Victoria: p2 queda eliminado al llegar a 0 vidas');
  assert(newState.status === 'finished', 'Victoria: el estado pasa a finished');
  assert(newState.winnerId === 'p1', 'Victoria: gana el único jugador vivo');
}

console.log('\nTodos los escenarios pasaron correctamente.');
