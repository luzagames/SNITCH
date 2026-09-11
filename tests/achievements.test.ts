import {
  createAchievementTracker,
  trackAchievementEvent,
  computeMatchAchievements,
  createStatsAccumulator,
  diffNewAchievements,
} from '../src/firebase/gameSyncLogic';
import type { PlayerPublicInfo, SyncedGameState, MatchStatsAccumulator, DealFlags } from '../src/firebase/gameSyncLogic';
import type { AchievementId } from '../src/game/achievements';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FALLÓ: ' + msg);
  console.log('OK:', msg);
}

function pub(overrides: Partial<Record<string, Partial<PlayerPublicInfo>>>, ids: string[]): Record<string, PlayerPublicInfo> {
  const base: Record<string, PlayerPublicInfo> = {};
  for (const id of ids) {
    base[id] = { name: id, lives: 4, alive: true, handCount: 3, ...(overrides[id] ?? {}) };
  }
  return base;
}

function aliveMapFrom(p: Record<string, PlayerPublicInfo>): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  for (const [id, info] of Object.entries(p)) m[id] = info.alive;
  return m;
}

function finalState(
  turnOrder: string[],
  winnerId: string | null,
  playersPublic: Record<string, PlayerPublicInfo>,
  dealFlags: Record<string, DealFlags> = {},
  anonymousOverrides: Record<string, boolean> = {}
): Omit<SyncedGameState, 'pendingAction'> {
  const flags: Record<string, DealFlags> = {};
  const isAnonymous: Record<string, boolean> = {};
  for (const id of turnOrder) {
    flags[id] = dealFlags[id] ?? { hadTriple: false, hadTwoJokers: false };
    isAnonymous[id] = anonymousOverrides[id] ?? false;
  }
  return {
    status: 'finished',
    startedAt: 1000,
    turnOrder,
    currentTurnIndex: 0,
    playersPublic,
    winnerId,
    lastMessage: '',
    lastAnswers: null,
    revealedCard: null,
    dealFlags: flags,
    isAnonymous,
    finalStats: null,
    finalAchievements: null,
    liveAchievementEvent: null,
  };
}

// --- 1. La Gran Poja: ganás habiendo bluffeado un Joker ---
{
  const t = createAchievementTracker();
  const p = pub({}, ['p1', 'p2']);
  trackAchievementEvent(t, { actorId: 'p1', type: 'kill', killHit: false, killWasSelfBluff: true, killWasJoker: true, killCardId: 'joker' }, aliveMapFrom(p), p, undefined);
  const grants = computeMatchAchievements(t, finalState(['p1', 'p2'], 'p1', p), {});
  assert(!!grants.p1?.includes('gran_poja'), 'Gran Poja: se otorga al ganador que bluffeó un Joker');
}
{
  // Negativo: bluffeó el Joker pero PERDIÓ la partida
  const t = createAchievementTracker();
  const p = pub({}, ['p1', 'p2']);
  trackAchievementEvent(t, { actorId: 'p1', type: 'kill', killHit: false, killWasSelfBluff: true, killWasJoker: true, killCardId: 'joker' }, aliveMapFrom(p), p, undefined);
  const grants = computeMatchAchievements(t, finalState(['p1', 'p2'], 'p2', p), {});
  assert(!grants.p1?.includes('gran_poja'), 'Gran Poja: NO se otorga si perdió, aunque haya bluffeado el Joker');
}

// --- 2. La Gran Chon: ganás cazando el bluff del último rival ---
{
  const t = createAchievementTracker();
  const p0 = pub({}, ['p1', 'p2']);
  trackAchievementEvent(t, { actorId: 'p2', type: 'kill', killHit: false, killWasSelfBluff: true, killCardId: 'hearts-7' }, aliveMapFrom(p0), p0, undefined);
  const afterHit = pub({ p2: { alive: false, handCount: 0 } }, ['p1', 'p2']);
  trackAchievementEvent(t, { actorId: 'p1', type: 'kill', killHit: true, killVictimId: 'p2', killCardId: 'hearts-7' }, aliveMapFrom(p0), afterHit, ['hearts-7']);
  const grants = computeMatchAchievements(t, finalState(['p1', 'p2'], 'p1', afterHit), {});
  assert(!!grants.p1?.includes('gran_chon'), 'Gran Chon: se otorga al ganar cazando el bluff pendiente del último rival');
}
{
  // Negativo: p1 le acierta a p2, pero esa carta NUNCA fue bluffeada por p2
  const t = createAchievementTracker();
  const p0 = pub({}, ['p1', 'p2']);
  const afterHit = pub({ p2: { alive: false, handCount: 0 } }, ['p1', 'p2']);
  trackAchievementEvent(t, { actorId: 'p1', type: 'kill', killHit: true, killVictimId: 'p2', killCardId: 'hearts-7' }, aliveMapFrom(p0), afterHit, undefined);
  const grants = computeMatchAchievements(t, finalState(['p1', 'p2'], 'p1', afterHit), {});
  assert(!grants.p1?.includes('gran_chon'), 'Gran Chon: NO se otorga si esa carta nunca fue un bluff pendiente');
}

// --- 3. A mí no me cabe una: 5 KILLs seguidos y vivo ---
{
  const t = createAchievementTracker();
  const alivePub = pub({}, ['p1', 'p2']);
  for (let i = 0; i < 5; i++) {
    trackAchievementEvent(t, { actorId: 'p1', type: 'kill', killHit: false }, aliveMapFrom(alivePub), alivePub, undefined);
  }
  assert(t.reachedFiveKillStreak.p1 === true, 'No me cabe una: se activa al 5to KILL seguido estando vivo');
}
{
  // Negativo: 4 KILLs seguidos, un ASK, y otro KILL — nunca llega a 5 seguidos
  const t = createAchievementTracker();
  const alivePub = pub({}, ['p1', 'p2']);
  for (let i = 0; i < 4; i++) trackAchievementEvent(t, { actorId: 'p1', type: 'kill', killHit: false }, aliveMapFrom(alivePub), alivePub, undefined);
  trackAchievementEvent(t, { actorId: 'p1', type: 'ask' }, aliveMapFrom(alivePub), alivePub, undefined);
  trackAchievementEvent(t, { actorId: 'p1', type: 'kill', killHit: false }, aliveMapFrom(alivePub), alivePub, undefined);
  assert(!t.reachedFiveKillStreak.p1, 'No me cabe una: la racha se corta con un ASK en el medio, no llega a 5 seguidos');
}

// --- 4. Primera Sangre: primer acierto de KILL de toda la partida ---
{
  const t = createAchievementTracker();
  const p = pub({}, ['p1', 'p2']);
  trackAchievementEvent(t, { actorId: 'p1', type: 'kill', killHit: false }, aliveMapFrom(p), p, undefined);
  trackAchievementEvent(t, { actorId: 'p2', type: 'kill', killHit: true, killVictimId: 'p1', killCardId: 'x' }, aliveMapFrom(p), p, undefined);
  assert(t.firstBloodClaimedBy === 'p2', 'Primera Sangre: se lo lleva quien acertó el primer KILL exitoso (no el que falló antes)');
}

// --- 5. Masterclass: ganás una de 6 sin perder ninguna carta ---
{
  const t = createAchievementTracker();
  const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const grants = computeMatchAchievements(t, finalState(ids, 'p1', pub({}, ids)), {});
  assert(!!grants.p1?.includes('masterclass'), 'Masterclass: se otorga con 6 jugadores, gana, y conserva sus 3 cartas');
}
{
  const t = createAchievementTracker();
  const ids = ['p1', 'p2', 'p3', 'p4']; // solo 4 jugadores, no 6
  const grants = computeMatchAchievements(t, finalState(ids, 'p1', pub({}, ids)), {});
  assert(!grants.p1?.includes('masterclass'), 'Masterclass: NO se otorga si la partida no era de 6 jugadores');
}

// --- 6. Hat-trick: 3 aciertos de KILL en la misma partida ---
{
  const t = createAchievementTracker();
  const stats: Record<string, MatchStatsAccumulator> = { p1: { ...createStatsAccumulator(), killHits: 3 } };
  const grants = computeMatchAchievements(t, finalState(['p1', 'p2'], null, pub({}, ['p1', 'p2'])), stats);
  assert(!!grants.p1?.includes('hat_trick'), 'Hat-trick: se otorga con 3 aciertos en la partida, sin importar si ganó');
}

// --- 7. Alto Trío: ganás con las 3 cartas del mismo número al repartir ---
{
  const t = createAchievementTracker();
  const grants = computeMatchAchievements(
    t,
    finalState(['p1', 'p2'], 'p1', pub({}, ['p1', 'p2']), { p1: { hadTriple: true, hadTwoJokers: false } }),
    {}
  );
  assert(!!grants.p1?.includes('alto_trio'), 'Alto Trío: se otorga si ganó y le tocó trío al repartir');
}

// --- 8. Ronda Troll: los 6 intentan KILL en su primer turno ---
{
  const t = createAchievementTracker();
  const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const p = pub({}, ids);
  for (const id of ids) {
    trackAchievementEvent(t, { actorId: id, type: 'kill', killHit: false }, aliveMapFrom(p), p, undefined);
  }
  const grants = computeMatchAchievements(t, finalState(ids, null, p), {});
  for (const id of ids) assert(!!grants[id]?.includes('ronda_troll'), `Ronda Troll: se otorga a ${id} (los 6 hicieron KILL primero)`);
}
{
  // Negativo: uno de los 6 preguntó en su primer turno
  const t = createAchievementTracker();
  const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const p = pub({}, ids);
  for (const id of ids.slice(0, 5)) {
    trackAchievementEvent(t, { actorId: id, type: 'kill', killHit: false }, aliveMapFrom(p), p, undefined);
  }
  trackAchievementEvent(t, { actorId: 'p6', type: 'ask' }, aliveMapFrom(p), p, undefined);
  const grants = computeMatchAchievements(t, finalState(ids, null, p), {});
  assert(!grants.p1?.includes('ronda_troll'), 'Ronda Troll: NO se otorga si uno solo de los 6 no hizo KILL primero');
}

// --- 9. Última Bala: ganás con 1 sola carta ---
{
  const t = createAchievementTracker();
  const grants = computeMatchAchievements(t, finalState(['p1', 'p2'], 'p1', pub({ p1: { handCount: 1 } }, ['p1', 'p2'])), {});
  assert(!!grants.p1?.includes('ultima_bala'), 'Última Bala: se otorga si ganás con 1 sola carta en la mano');
}

// --- 10. ¿Qué tipo humilde?: tus primeras 3 rondas personales son PASAR ---
{
  const t = createAchievementTracker();
  const p = pub({}, ['p1', 'p2']);
  trackAchievementEvent(t, { actorId: 'p1', type: 'pass' }, aliveMapFrom(p), p, undefined);
  trackAchievementEvent(t, { actorId: 'p1', type: 'pass' }, aliveMapFrom(p), p, undefined);
  trackAchievementEvent(t, { actorId: 'p1', type: 'pass' }, aliveMapFrom(p), p, undefined);
  const grants = computeMatchAchievements(t, finalState(['p1', 'p2'], null, p), {});
  assert(!!grants.p1?.includes('tipo_humilde'), 'Tipo humilde: se otorga con tus primeras 3 rondas propias en PASAR');
}
{
  // Negativo: la segunda de tus 3 rondas fue un KILL
  const t = createAchievementTracker();
  const p = pub({}, ['p1', 'p2']);
  trackAchievementEvent(t, { actorId: 'p1', type: 'pass' }, aliveMapFrom(p), p, undefined);
  trackAchievementEvent(t, { actorId: 'p1', type: 'kill', killHit: false }, aliveMapFrom(p), p, undefined);
  trackAchievementEvent(t, { actorId: 'p1', type: 'pass' }, aliveMapFrom(p), p, undefined);
  const grants = computeMatchAchievements(t, finalState(['p1', 'p2'], null, p), {});
  assert(!grants.p1?.includes('tipo_humilde'), 'Tipo humilde: NO se otorga si alguna de las primeras 3 no fue pasar');
}

// --- 11. ¿Don o maldición?: te tocaron los 2 Jokers al repartir ---
{
  const t = createAchievementTracker();
  const grants = computeMatchAchievements(
    t,
    finalState(['p1', 'p2'], null, pub({}, ['p1', 'p2']), { p1: { hadTriple: false, hadTwoJokers: true } }),
    {}
  );
  assert(!!grants.p1?.includes('don_o_maldicion'), 'Don o maldición: se otorga con los 2 Jokers al repartir, gane o no');
}

// --- 12. Pedazo de Nashe: eliminaste a TODOS por tus propias cartas (4+) ---
{
  const t = createAchievementTracker();
  const ids = ['p1', 'p2', 'p3', 'p4'];
  let alive = pub({}, ids);
  for (const victim of ['p2', 'p3', 'p4']) {
    const before = aliveMapFrom(alive);
    alive = { ...alive, [victim]: { ...alive[victim], alive: false, handCount: 0 } };
    trackAchievementEvent(t, { actorId: 'p1', type: 'kill', killHit: true, killVictimId: victim, killCardId: 'x' + victim }, before, alive, undefined);
  }
  const grants = computeMatchAchievements(t, finalState(ids, 'p1', alive), {});
  assert(!!grants.p1?.includes('pedazo_de_nashe'), 'Pedazo de Nashe: se otorga si eliminaste a los 3 rivales por cartas en una de 4+');
}
{
  // Negativo: uno de los rivales quedó eliminado por VIDAS, no por las cartas de p1
  const t = createAchievementTracker();
  const ids = ['p1', 'p2', 'p3', 'p4'];
  let alive = pub({}, ids);
  for (const victim of ['p2', 'p3']) {
    const before = aliveMapFrom(alive);
    alive = { ...alive, [victim]: { ...alive[victim], alive: false, handCount: 0 } };
    trackAchievementEvent(t, { actorId: 'p1', type: 'kill', killHit: true, killVictimId: victim, killCardId: 'x' + victim }, before, alive, undefined);
  }
  alive = { ...alive, p4: { ...alive.p4, alive: false } }; // p4 se elimina solo, por sus propias vidas
  const grants = computeMatchAchievements(t, finalState(ids, 'p1', alive), {});
  assert(!grants.p1?.includes('pedazo_de_nashe'), 'Pedazo de Nashe: NO se otorga si algún rival se eliminó solo, no por tus KILLs');
}

// --- 13. Muy Govir: quedás eliminado primero en una de 6 ---
{
  const t = createAchievementTracker();
  const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const before = pub({}, ids);
  const alive = pub({ p3: { alive: false, handCount: 0 } }, ids);
  trackAchievementEvent(t, { actorId: 'p1', type: 'kill', killHit: true, killVictimId: 'p3', killCardId: 'x' }, aliveMapFrom(before), alive, undefined);
  const grants = computeMatchAchievements(t, finalState(ids, null, alive), {});
  assert(!!grants.p3?.includes('muy_govir'), 'Muy Govir: se otorga al primero en ser eliminado, en una partida de 6');
}
{
  const t = createAchievementTracker();
  const ids = ['p1', 'p2', 'p3', 'p4']; // solo 4, no 6
  const before = pub({}, ids);
  const alive = pub({ p3: { alive: false, handCount: 0 } }, ids);
  trackAchievementEvent(t, { actorId: 'p1', type: 'kill', killHit: true, killVictimId: 'p3', killCardId: 'x' }, aliveMapFrom(before), alive, undefined);
  const grants = computeMatchAchievements(t, finalState(ids, null, alive), {});
  assert(!grants.p3?.includes('muy_govir'), 'Muy Govir: NO se otorga si la partida no era de 6');
}

// --- 14. diffNewAchievements: no repite lo ya notificado ---
{
  const notified: Record<string, Set<AchievementId>> = {};

  const round1 = diffNewAchievements(notified, { p1: ['primera_sangre'] });
  assert(JSON.stringify(round1) === JSON.stringify({ p1: ['primera_sangre'] }), 'Diff: la primera vez, todo es nuevo');

  const round2 = diffNewAchievements(notified, { p1: ['primera_sangre'] });
  assert(Object.keys(round2).length === 0, 'Diff: la segunda vez con lo MISMO, no hay nada nuevo (no se repite el popup)');

  const round3 = diffNewAchievements(notified, { p1: ['primera_sangre', 'hat_trick'] });
  assert(JSON.stringify(round3) === JSON.stringify({ p1: ['hat_trick'] }), 'Diff: si aparece uno nuevo además del viejo, solo devuelve el nuevo');
}

// --- 15. Los jugadores anónimos NUNCA reciben logros ---
{
  const t = createAchievementTracker();
  const grants = computeMatchAchievements(t, finalState(['p1', 'p2'], 'p1', pub({ p1: { handCount: 1 } }, ['p1', 'p2']), {}, { p1: true }), {});
  assert(!grants.p1, 'Anónimo: nunca recibe nada, ni siquiera "Última Bala" ganando con 1 carta');
}
{
  // Ronda Troll: los 6 hicieron KILL primero, pero p6 es anónimo — no debe recibirlo
  const t = createAchievementTracker();
  const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const p = pub({}, ids);
  for (const id of ids) trackAchievementEvent(t, { actorId: id, type: 'kill', killHit: false }, aliveMapFrom(p), p, undefined);
  const grants = computeMatchAchievements(t, finalState(ids, null, p, {}, { p6: true }), {});
  assert(!!grants.p1?.includes('ronda_troll'), 'Ronda Troll: los demás SÍ lo reciben aunque uno sea anónimo');
  assert(!grants.p6, 'Ronda Troll: pero el anónimo (p6) no recibe nada');
}

console.log('\nTodos los tests de logros pasaron correctamente (13 casos, cubriendo los 17 logros + negativos clave).');
