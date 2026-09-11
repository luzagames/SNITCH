import { applyStatsEvent, finalizeBluffStats } from './gameSyncLogic';
import type { ActionStatsEvent, MatchStatsAccumulator } from './gameSyncLogic';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FALLÓ: ' + msg);
  console.log('OK:', msg);
}

// --- Escenario 1: bluff exitoso — nadie le vuelve a acertar en toda la partida ---
{
  const acc: Record<string, MatchStatsAccumulator> = {};
  const pending: Record<string, string[]> = {};

  const events: ActionStatsEvent[] = [
    { actorId: 'p1', type: 'kill', killHit: false, killWasSelfBluff: true, killCardId: 'hearts-7' },
    { actorId: 'p2', type: 'ask' },
    { actorId: 'p1', type: 'pass' },
  ];
  for (const e of events) applyStatsEvent(acc, pending, e);
  finalizeBluffStats(acc, pending); // partida termina acá

  assert(acc.p1.selfBluffs === 1, 'Bluff exitoso: se cuenta como bluff realizado');
  assert(acc.p1.successfulBluffs === 1, 'Bluff exitoso: nadie lo cachó en toda la partida, cuenta como exitoso');
}

// --- Escenario 2: bluff que SÍ es descubierto después, por otro jugador ---
{
  const acc: Record<string, MatchStatsAccumulator> = {};
  const pending: Record<string, string[]> = {};

  const events: ActionStatsEvent[] = [
    { actorId: 'p1', type: 'kill', killHit: false, killWasSelfBluff: true, killCardId: 'hearts-7' },
    // más tarde, p2 le acierta a esa MISMA carta (7 de corazones) que tenía p1
    {
      actorId: 'p2',
      type: 'kill',
      killHit: true,
      killVictimId: 'p1',
      killCardId: 'hearts-7',
    },
  ];
  for (const e of events) applyStatsEvent(acc, pending, e);
  finalizeBluffStats(acc, pending);

  assert(acc.p1.selfBluffs === 1, 'Bluff cachado: sigue contando como bluff realizado');
  assert(acc.p1.successfulBluffs === 0, 'Bluff cachado: NO cuenta como exitoso, alguien se lo encontró después');
  assert(acc.p2.killHits === 1, 'Bluff cachado: el que lo descubrió suma 1 acierto de KILL');
}

// --- Escenario 3: el propio jugador vuelve a "acertarse" su bluff más tarde
// (bluffea, y en otro turno vuelve a targetear esa misma carta — ya no es
// bluff la segunda vez porque ahora SABE que la tiene, sería un auto-hit) ---
{
  const acc: Record<string, MatchStatsAccumulator> = {};
  const pending: Record<string, string[]> = {};

  // Nota: la segunda vez que targetea su propia carta, resolveKill ya la
  // trataría de nuevo como selfBluff (mismo comportamiento, no se "gasta").
  // Este test solo confirma que un segundo bluff sobre la MISMA carta no
  // rompe el conteo (se cuenta como 2 intentos de bluff, la carta sigue
  // pendiente una sola vez en la lista... en realidad se duplicaría en la
  // lista, lo cual es aceptable: si después alguien la caza, se saca una
  // sola ocurrencia y la otra queda pendiente. Documentamos el comportamiento).
  const events: ActionStatsEvent[] = [
    { actorId: 'p1', type: 'kill', killHit: false, killWasSelfBluff: true, killCardId: 'hearts-7' },
    { actorId: 'p1', type: 'kill', killHit: false, killWasSelfBluff: true, killCardId: 'hearts-7' },
  ];
  for (const e of events) applyStatsEvent(acc, pending, e);
  finalizeBluffStats(acc, pending);

  assert(acc.p1.selfBluffs === 2, 'Doble bluff misma carta: se cuentan los 2 intentos');
  assert(acc.p1.successfulBluffs === 2, 'Doble bluff misma carta: ambas quedan como exitosas si nadie la caza');
}

// --- Escenario 4: KILL exitoso sobre un Joker ---
{
  const acc: Record<string, MatchStatsAccumulator> = {};
  const pending: Record<string, string[]> = {};

  applyStatsEvent(acc, pending, {
    actorId: 'p1',
    type: 'kill',
    killHit: true,
    killWasJoker: true,
    killVictimId: 'p2',
    killCardId: 'joker',
  });

  assert(acc.p1.killHits === 1, 'Joker cazado: cuenta como acierto de KILL');
  assert(acc.p1.jokersCaught === 1, 'Joker cazado: se registra específicamente como Joker');
}

// --- Escenario 5: precisión de KILL a lo largo de varios intentos ---
{
  const acc: Record<string, MatchStatsAccumulator> = {};
  const pending: Record<string, string[]> = {};

  applyStatsEvent(acc, pending, { actorId: 'p1', type: 'kill', killHit: true, killVictimId: 'p2', killCardId: 'a' });
  applyStatsEvent(acc, pending, { actorId: 'p1', type: 'kill', killHit: false, killCardId: 'b' });
  applyStatsEvent(acc, pending, { actorId: 'p1', type: 'kill', killHit: false, killCardId: 'c' });
  applyStatsEvent(acc, pending, { actorId: 'p1', type: 'ask' });
  applyStatsEvent(acc, pending, { actorId: 'p1', type: 'pass' });

  assert(acc.p1.killAttempts === 3, 'Precisión: 3 intentos de KILL registrados');
  assert(acc.p1.killHits === 1, 'Precisión: 1 de esos 3 fue acierto');
  assert(acc.p1.askCount === 1, 'Precisión: 1 pregunta registrada');
  assert(acc.p1.passCount === 1, 'Precisión: 1 pase registrado');
}

// --- Escenario 6: sin ningún evento, finalizeBluffStats no rompe nada ---
{
  const acc: Record<string, MatchStatsAccumulator> = {};
  const pending: Record<string, string[]> = {};
  finalizeBluffStats(acc, pending);
  assert(Object.keys(acc).length === 0, 'Sin eventos: no se crea ningún acumulador de la nada');
}

console.log('\nTodos los escenarios de estadísticas pasaron correctamente.');

// ============================================================
// TEST DE INTEGRACIÓN: una partida real completa, de punta a punta,
// combinando applyPendingAction (el motor real) con el acumulador de
// estadísticas — no solo piezas aisladas.
// ============================================================
import { applyPendingAction } from './gameSyncLogic';
import type { SyncedGameState } from './gameSyncLogic';
import type { Card } from '../game/types';

{
  const acc: Record<string, MatchStatsAccumulator> = {};
  const pending: Record<string, string[]> = {};

  let gs: SyncedGameState = {
    status: 'playing',
    turnOrder: ['p1', 'p2'],
    currentTurnIndex: 0,
    playersPublic: {
      p1: { name: 'Lolo', lives: 4, alive: true, handCount: 1 },
      p2: { name: 'Juan', lives: 1, alive: true, handCount: 1 }, // a una vida de perder
    },
    winnerId: null,
    lastMessage: '',
    lastAnswers: null,
    pendingAction: null,
    revealedCard: null,
    dealFlags: {},
    finalStats: null,
    finalAchievements: null,
    liveAchievementEvent: null,
  };

  let hands: Record<string, Card[]> = {
    p1: [{ kind: 'standard', suit: 'hearts', rank: 7 }],
    p2: [{ kind: 'standard', suit: 'spades', rank: 3 }],
  };

  function runAction(pendingAction: SyncedGameState['pendingAction']) {
    gs = { ...gs, pendingAction };
    const { newState, changedHands, statsEvent } = applyPendingAction(gs, hands);
    applyStatsEvent(acc, pending, statsEvent);
    for (const [uid, cards] of Object.entries(changedHands)) hands[uid] = cards;
    if (newState.status === 'finished') finalizeBluffStats(acc, pending);
    gs = { ...gs, ...newState, pendingAction: null };
  }

  // Turno 1: Lolo bluffea con su propia carta (falla, pierde 1 vida: 4->3)
  runAction({ type: 'kill', actorId: 'p1', card: { kind: 'standard', suit: 'hearts', rank: 7 } });
  // Turno 2: Juan intenta un KILL sobre una carta que NO tiene Lolo (falla, Juan pierde su última vida y queda eliminado)
  runAction({ type: 'kill', actorId: 'p2', card: { kind: 'standard', suit: 'clubs', rank: 9 } });

  assert(gs.status === 'finished', 'Integración: la partida termina (Juan se quedó sin vidas)');
  assert(gs.winnerId === 'p1', 'Integración: gana Lolo');
  assert(acc.p1.selfBluffs === 1, 'Integración: el bluff de Lolo quedó contabilizado');
  assert(acc.p1.successfulBluffs === 1, 'Integración: nadie descubrió esa carta en toda la partida, cuenta como exitoso');
  assert(acc.p2.killAttempts === 1 && acc.p2.killHits === 0, 'Integración: el intento fallido de Juan quedó contabilizado');
}

console.log('\nTest de integración completo pasó correctamente.');
