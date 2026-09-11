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
    revealedCard: null,
    dealFlags: {},
    isAnonymous: { p1: false, p2: false },
    finalStats: null,
    finalAchievements: null,
    liveAchievementEvent: null,
    ...overrides,
  };
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FALLÓ: ' + msg);
  console.log('OK:', msg);
}

// --- Escenario 1: KILL exitoso -> el killer se cura 1 vida ---
{
  const target: Card = { kind: 'standard', suit: 'hearts', rank: 7 };
  const hands = {
    p1: [{ kind: 'standard', suit: 'spades', rank: 1 } as Card, { kind: 'standard', suit: 'clubs', rank: 2 } as Card, { kind: 'standard', suit: 'diamonds', rank: 3 } as Card],
    p2: [target, { kind: 'standard', suit: 'clubs', rank: 9 } as Card, { kind: 'standard', suit: 'diamonds', rank: 10 } as Card],
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
  assert(
    !!newState.revealedCard &&
      newState.revealedCard.ownerId === 'p2' &&
      newState.revealedCard.card.kind === 'standard' &&
      newState.revealedCard.card.rank === 7 &&
      newState.revealedCard.card.suit === 'hearts',
    'KILL exitoso: revealedCard queda seteado con la carta y el dueño correctos'
  );
}

// --- Escenario 1b: la curación no puede superar el máximo (4) ---
{
  const target: Card = { kind: 'standard', suit: 'hearts', rank: 7 };
  const hands = {
    p1: [{ kind: 'standard', suit: 'spades', rank: 1 } as Card, { kind: 'standard', suit: 'clubs', rank: 2 } as Card, { kind: 'standard', suit: 'diamonds', rank: 3 } as Card],
    p2: [target, { kind: 'standard', suit: 'clubs', rank: 9 } as Card, { kind: 'standard', suit: 'diamonds', rank: 10 } as Card],
  };
  const gs = baseGs({ pendingAction: { type: 'kill', actorId: 'p1', card: target } }); // p1 ya arranca con 4 (máximo)
  const { newState } = applyPendingAction(gs, hands);

  assert(newState.playersPublic.p1.lives === 4, 'Curación con tope: no supera el máximo de 4 vidas');
}

// --- Escenario 2: KILL fallido (nadie tiene la carta) ---
{
  const target: Card = { kind: 'standard', suit: 'hearts', rank: 13 };
  const hands = {
    p1: [{ kind: 'standard', suit: 'spades', rank: 1 } as Card, { kind: 'standard', suit: 'clubs', rank: 2 } as Card, { kind: 'standard', suit: 'diamonds', rank: 3 } as Card],
    p2: [{ kind: 'standard', suit: 'clubs', rank: 9 } as Card, { kind: 'standard', suit: 'diamonds', rank: 10 } as Card, { kind: 'standard', suit: 'spades', rank: 5 } as Card],
  };
  const gs = baseGs({ pendingAction: { type: 'kill', actorId: 'p1', card: target } });
  const { newState, changedHands } = applyPendingAction(gs, hands);

  assert(newState.playersPublic.p1.lives === 3, 'KILL fallido: el killer pierde 1 vida (4 -> 3)');
  assert(Object.keys(changedHands).length === 0, 'KILL fallido: ninguna mano cambia');
  assert(newState.revealedCard === null, 'KILL fallido: revealedCard queda en null');
}

// --- Escenario 3: bluff sobre la propia carta ---
{
  const ownCard: Card = { kind: 'standard', suit: 'diamonds', rank: 4 };
  const hands = {
    p1: [ownCard, { kind: 'standard', suit: 'clubs', rank: 2 } as Card, { kind: 'standard', suit: 'diamonds', rank: 3 } as Card],
    p2: [{ kind: 'standard', suit: 'clubs', rank: 9 } as Card, { kind: 'standard', suit: 'diamonds', rank: 10 } as Card, { kind: 'standard', suit: 'spades', rank: 5 } as Card],
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
  assert(
    newState.revealedCard === null,
    'Bluff: revealedCard queda en null (si se seteara, delataría la carta igual que el mensaje)'
  );
}

// --- Escenario 4: ASK ya NO penaliza, aunque nadie responda ✓ ---
{
  const hands = {
    p1: [{ kind: 'standard', suit: 'spades', rank: 1 } as Card],
    p2: [{ kind: 'standard', suit: 'clubs', rank: 2 } as Card],
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
    p1: [{ kind: 'standard', suit: 'spades', rank: 1 } as Card],
    p2: [{ kind: 'standard', suit: 'clubs', rank: 2 } as Card],
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
  const hands = { p1: [{ kind: 'standard', suit: 'spades', rank: 1 } as Card], p2: [{ kind: 'standard', suit: 'clubs', rank: 2 } as Card] };
  const gs = baseGs({
    playersPublic: {
      p1: { name: 'Lolo', lives: 4, alive: true, handCount: 1 },
      p2: { name: 'Juan', lives: 1, alive: true, handCount: 1 },
    },
    currentTurnIndex: 1,
    pendingAction: { type: 'kill', actorId: 'p2', card: { kind: 'standard', suit: 'hearts', rank: 13 } },
  });
  const { newState } = applyPendingAction(gs, hands);

  assert(newState.playersPublic.p2.alive === false, 'Victoria: p2 queda eliminado al llegar a 0 vidas');
  assert(newState.status === 'finished', 'Victoria: el estado pasa a finished');
  assert(newState.winnerId === 'p1', 'Victoria: gana el único jugador vivo');
}

// --- Escenario 7: Joker — killer tiene uno, PERO otro jugador también
// tiene el otro Joker. Antes esto se hubiera asumido bluff a ciegas; ahora
// tiene que encontrar al otro jugador y ser un HIT de verdad. ---
{
  const hands = {
    p1: [{ kind: 'joker' } as Card, { kind: 'standard', suit: 'clubs', rank: 2 } as Card],
    p2: [{ kind: 'joker' } as Card, { kind: 'standard', suit: 'diamonds', rank: 5 } as Card],
  };
  const gs = baseGs({
    playersPublic: {
      p1: { name: 'Lolo', lives: 4, alive: true, handCount: 2 },
      p2: { name: 'Juan', lives: 4, alive: true, handCount: 2 },
    },
    pendingAction: { type: 'kill', actorId: 'p1', card: { kind: 'joker' } },
  });
  const { newState, changedHands } = applyPendingAction(gs, hands);

  assert(newState.playersPublic.p2.handCount === 1, 'Joker duplicado: p2 pierde SU Joker (fue un hit real, no bluff)');
  assert(newState.playersPublic.p1.lives === 4, 'Joker duplicado: p1 (killer) no pierde vida (además se cura, tope 4)');
  assert(!!changedHands.p2, 'Joker duplicado: la mano de p2 se marca como cambiada');
  assert(newState.lastMessage.includes('Lolo descubrió que Juan tenía el JOKER'), 'Joker duplicado: el mensaje revela a Juan, no a Lolo');
}

// --- Escenario 8: Joker — killer tiene uno, NADIE más tiene ninguno.
// Acá sí tiene que ser un bluff (mismo comportamiento de siempre). ---
{
  const hands = {
    p1: [{ kind: 'joker' } as Card],
    p2: [{ kind: 'standard', suit: 'diamonds', rank: 5 } as Card],
  };
  const gs = baseGs({
    playersPublic: {
      p1: { name: 'Lolo', lives: 4, alive: true, handCount: 1 },
      p2: { name: 'Juan', lives: 4, alive: true, handCount: 1 },
    },
    pendingAction: { type: 'kill', actorId: 'p1', card: { kind: 'joker' } },
  });
  const { newState, changedHands } = applyPendingAction(gs, hands);

  assert(newState.playersPublic.p1.lives === 3, 'Joker sin duplicado: sigue siendo bluff, pierde 1 vida');
  assert(newState.playersPublic.p1.handCount === 1, 'Joker sin duplicado: conserva su Joker');
  assert(Object.keys(changedHands).length === 0, 'Joker sin duplicado: ninguna mano cambia');
}

console.log('\nTodos los escenarios pasaron correctamente.');
