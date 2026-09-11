import { createGame, resolveKill, resolveAsk, resolvePass } from '../game/rules';
import { cardLabel } from '../game/display';
import { questionLabel } from '../game/askQuestions';
import type { AskQuestion, Card, GameState } from '../game/types';
import { cardId } from '../game/types';
import type { AchievementId } from '../game/achievements';

export interface PlayerPublicInfo {
  name: string;
  lives: number;
  alive: boolean;
  handCount: number;
}

export type PendingAction =
  | { type: 'kill'; actorId: string; card: Card }
  | { type: 'ask'; actorId: string; question: AskQuestion }
  | { type: 'pass'; actorId: string };

export interface RevealedCard {
  card: Card;
  ownerId: string; // quién tenía la carta
  revealedAt: number; // timestamp, para que el cliente detecte "esto es nuevo"
}

// Datos fijos del reparto inicial, para logros que dependen de qué te tocó
// al empezar (no cambian nunca durante la partida, aunque la mano se achique).
export interface DealFlags {
  hadTriple: boolean; // las 3 cartas iniciales tenían el mismo número
  hadTwoJokers: boolean; // te tocaron los 2 Jokers
}

export interface LiveAchievementEvent {
  grants: Record<string, AchievementId[]>; // solo los logros NUEVOS de este momento
  eventAt: number; // timestamp, para que el cliente detecte "esto es nuevo"
}

export interface SyncedGameState {
  status: 'playing' | 'finished';
  turnOrder: string[];
  currentTurnIndex: number;
  playersPublic: Record<string, PlayerPublicInfo>;
  winnerId: string | null;
  lastMessage: string;
  lastAnswers: { playerId: string; matches: boolean }[] | null;
  pendingAction: PendingAction | null;
  revealedCard: RevealedCard | null;
  dealFlags: Record<string, DealFlags>;
  // Solo se completan UNA VEZ, cuando la partida termina. Cada cliente lee
  // únicamente su propia entrada para actualizar su perfil.
  finalStats: Record<string, MatchStatsAccumulator> | null;
  finalAchievements: Record<string, AchievementId[]> | null;
  // Se actualiza cada vez que alguien desbloquea un logro NUEVO durante la
  // partida (no solo al final) — es lo que dispara el popup en pantalla.
  liveAchievementEvent: LiveAchievementEvent | null;
}

// ------------------------------------------------------------------
// ESTADÍSTICAS DE PARTIDA (para el perfil)
// ------------------------------------------------------------------
// Todo esto es puro (sin Firestore): describe qué pasó en UNA acción, y
// cómo acumular esos eventos a lo largo de TODA la partida. Quien llama
// (el árbitro, del lado del host) es responsable de ir acumulando los
// eventos en memoria durante el partido y escribir el resultado final.

export interface ActionStatsEvent {
  actorId: string;
  type: 'kill' | 'ask' | 'pass';
  killHit?: boolean;
  killWasJoker?: boolean;
  killWasSelfBluff?: boolean;
  killVictimId?: string;
  killCardId?: string;
}

export interface MatchStatsAccumulator {
  killAttempts: number;
  killHits: number;
  jokersCaught: number;
  selfBluffs: number;
  successfulBluffs: number;
  askCount: number;
  passCount: number;
}

export function createStatsAccumulator(): MatchStatsAccumulator {
  return {
    killAttempts: 0,
    killHits: 0,
    jokersCaught: 0,
    selfBluffs: 0,
    successfulBluffs: 0,
    askCount: 0,
    passCount: 0,
  };
}

// Acumula UN evento en el diccionario de estadísticas (mutando ambos
// parámetros in-place: es la forma más simple de ir sumando a medida que
// se procesan las acciones de toda la partida).
//
// pendingBluffs lleva, por jugador, la lista de cartas que bluffeó y que
// TODAVÍA no fueron descubiertas. Si más adelante alguien le acierta a esa
// carta puntual, se saca de la lista (el bluff fue "cachado"). Lo que
// quede en la lista al terminar la partida son los bluffs exitosos.
export function applyStatsEvent(
  acc: Record<string, MatchStatsAccumulator>,
  pendingBluffs: Record<string, string[]>,
  event: ActionStatsEvent
): void {
  if (!acc[event.actorId]) acc[event.actorId] = createStatsAccumulator();
  const a = acc[event.actorId];

  if (event.type === 'kill') {
    a.killAttempts++;
    if (event.killHit) {
      a.killHits++;
      if (event.killWasJoker) a.jokersCaught++;
      // ¿Justo le acertaron a una carta que alguien tenía bluffeada?
      // Si es así, ese bluff quedó cachado — sale de la lista de pendientes.
      if (event.killVictimId && event.killCardId) {
        const list = pendingBluffs[event.killVictimId];
        if (list) {
          const idx = list.indexOf(event.killCardId);
          if (idx !== -1) list.splice(idx, 1);
        }
      }
    } else if (event.killWasSelfBluff) {
      a.selfBluffs++;
      if (!pendingBluffs[event.actorId]) pendingBluffs[event.actorId] = [];
      pendingBluffs[event.actorId].push(event.killCardId!);
    }
  } else if (event.type === 'ask') {
    a.askCount++;
  } else {
    a.passCount++;
  }
}

// Se llama UNA vez, cuando la partida termina: todo lo que quedó en
// pendingBluffs nunca fue descubierto, así que cuenta como bluff exitoso.
export function finalizeBluffStats(
  acc: Record<string, MatchStatsAccumulator>,
  pendingBluffs: Record<string, string[]>
): void {
  for (const [playerId, cards] of Object.entries(pendingBluffs)) {
    if (cards.length === 0) continue;
    if (!acc[playerId]) acc[playerId] = createStatsAccumulator();
    acc[playerId].successfulBluffs += cards.length;
  }
}

// Arma el SyncedGameState inicial (llamado al arrancar la partida).
export function buildInitialSyncedState(players: { id: string; name: string }[]): {
  state: Omit<SyncedGameState, 'pendingAction'>;
  hands: Record<string, Card[]>;
} {
  const engineState = createGame(players);
  const playersPublic: Record<string, PlayerPublicInfo> = {};
  const hands: Record<string, Card[]> = {};
  const dealFlags: Record<string, DealFlags> = {};
  for (const p of engineState.players) {
    playersPublic[p.id] = { name: p.name, lives: p.lives, alive: p.alive, handCount: p.hand.length };
    hands[p.id] = p.hand;

    const jokerCount = p.hand.filter((c) => c.kind === 'joker').length;
    const standardRanks = p.hand.filter((c) => c.kind === 'standard').map((c) => c.rank);
    const hadTriple = p.hand.length === 3 && standardRanks.length === 3 && new Set(standardRanks).size === 1;
    dealFlags[p.id] = { hadTriple, hadTwoJokers: jokerCount >= 2 };
  }
  return {
    state: {
      status: 'playing',
      turnOrder: engineState.players.map((p) => p.id),
      currentTurnIndex: engineState.currentTurnIndex,
      playersPublic,
      winnerId: null,
      lastMessage: '¡Arrancó la partida!',
      lastAnswers: null,
      revealedCard: null,
      dealFlags,
      finalStats: null,
      finalAchievements: null,
      liveAchievementEvent: null,
    },
    hands,
  };
}

// Función pura: dado el estado público + las manos reales, reconstruye el
// estado interno, resuelve la acción pendiente con el motor de reglas, y
// devuelve el nuevo estado público más las manos que cambiaron. Cero
// dependencia de Firestore, así se puede testear con datos inventados.
export function applyPendingAction(
  gs: SyncedGameState,
  handsByUid: Record<string, Card[]>
): {
  newState: Omit<SyncedGameState, 'pendingAction'>;
  changedHands: Record<string, Card[]>;
  statsEvent: ActionStatsEvent;
} {
  const engineState: GameState = {
    status: 'playing',
    currentTurnIndex: gs.currentTurnIndex,
    history: [],
    players: gs.turnOrder.map((uid) => ({
      id: uid,
      name: gs.playersPublic[uid].name,
      hand: handsByUid[uid] ?? [],
      lives: gs.playersPublic[uid].lives,
      alive: gs.playersPublic[uid].alive,
      isSpectator: false,
    })),
  };

  const action = gs.pendingAction!;
  let message = '';
  let lastAnswers: SyncedGameState['lastAnswers'] = null;
  let revealedCard: SyncedGameState['revealedCard'] = null;
  let statsEvent: ActionStatsEvent;

  if (action.type === 'kill') {
    const result = resolveKill(engineState, action.actorId, action.card);
    const actorName = gs.playersPublic[action.actorId].name;
    statsEvent = {
      actorId: action.actorId,
      type: 'kill',
      killHit: result.hit,
      killWasJoker: action.card.kind === 'joker',
      killWasSelfBluff: !!result.selfBluff,
      killVictimId: result.hit ? result.hitPlayerId : undefined,
      killCardId: cardId(action.card),
    };
    if (result.hit) {
      const victimName = gs.playersPublic[result.hitPlayerId!].name;
      message = `¡Impacto! ${actorName} descubrió que ${victimName} tenía el ${cardLabel(action.card)}.`;
      revealedCard = { card: action.card, ownerId: result.hitPlayerId!, revealedAt: Date.now() };
    } else {
      // OJO: este texto tiene que ser IDÉNTICO tanto si fue un fallo real
      // como si fue un bluff sobre la propia carta (result.selfBluff).
      // Si acá dijéramos "bluffeó con la carta X", estaríamos revelando
      // públicamente que el actor tiene esa carta — literalmente lo
      // opuesto de lo que un bluff debería lograr. El actor ya sabe si
      // conservó su carta con solo mirar su propia mano; nadie más debe
      // poder distinguir este caso de un fallo genuino.
      message = `Nadie tenía ${cardLabel(action.card)}. ${actorName} perdió 1 corazón.`;
    }
  } else if (action.type === 'ask') {
    const result = resolveAsk(engineState, action.actorId, action.question);
    const actorName = gs.playersPublic[action.actorId].name;
    lastAnswers = result.answers;
    statsEvent = { actorId: action.actorId, type: 'ask' };
    // ASK ya no tiene penalización, así que el mensaje es siempre el mismo
    // independientemente de si alguien respondió ✓ o no.
    message = `${actorName} preguntó: "${questionLabel(action.question)}"`;
  } else {
    resolvePass(engineState, action.actorId);
    const actorName = gs.playersPublic[action.actorId].name;
    statsEvent = { actorId: action.actorId, type: 'pass' };
    message = `${actorName} pasó su turno.`;
  }

  const playersPublic: Record<string, PlayerPublicInfo> = {};
  const changedHands: Record<string, Card[]> = {};
  for (const p of engineState.players) {
    playersPublic[p.id] = { name: p.name, lives: p.lives, alive: p.alive, handCount: p.hand.length };
    const before = handsByUid[p.id] ?? [];
    if (before.length !== p.hand.length) {
      changedHands[p.id] = p.hand;
    }
  }

  return {
    newState: {
      status: engineState.status === 'finished' ? 'finished' : 'playing',
      turnOrder: gs.turnOrder,
      currentTurnIndex: engineState.currentTurnIndex,
      playersPublic,
      winnerId: engineState.winnerId ?? null,
      lastMessage: message,
      lastAnswers,
      revealedCard,
      dealFlags: gs.dealFlags,
      finalStats: gs.finalStats,
      finalAchievements: gs.finalAchievements,
      liveAchievementEvent: gs.liveAchievementEvent,
    },
    changedHands,
    statsEvent,
  };
}

// ------------------------------------------------------------------
// LOGROS DE PARTIDA
// ------------------------------------------------------------------
// Igual que las estadísticas: puro, sin Firestore. El árbitro (host) va
// alimentando esto acción por acción durante TODA la partida, y recién al
// final se decide qué logros se ganó cada uno con computeMatchAchievements.

export interface MatchAchievementTracker {
  killStreak: Record<string, number>;
  reachedFiveKillStreak: Record<string, boolean>;
  bluffedJoker: Record<string, boolean>;
  cardsEliminatedBy: Record<string, Set<string>>; // actorId -> víctimas que eliminó por cartas
  turnsTaken: Record<string, number>;
  firstThreePass: Record<string, boolean>;
  firstActionType: Record<string, 'kill' | 'ask' | 'pass'>;
  firstBloodClaimedBy: string | null;
  firstEliminatedPlayerId: string | null;
  wonByCatchingBluffPlayerId: string | null;
}

export function createAchievementTracker(): MatchAchievementTracker {
  return {
    killStreak: {},
    reachedFiveKillStreak: {},
    bluffedJoker: {},
    cardsEliminatedBy: {},
    turnsTaken: {},
    firstThreePass: {},
    firstActionType: {},
    firstBloodClaimedBy: null,
    firstEliminatedPlayerId: null,
    wonByCatchingBluffPlayerId: null,
  };
}

// Se llama una vez por cada acción resuelta, con el estado de "vivo" antes
// y después de esa acción (para poder detectar "alguien recién quedó
// eliminado ahora"), y la lista de bluffs pendientes de la víctima ANTES
// de procesar este evento (para saber si esta acción justo cachó uno).
export function trackAchievementEvent(
  tracker: MatchAchievementTracker,
  event: ActionStatsEvent,
  prevAlive: Record<string, boolean>,
  newPlayersPublic: Record<string, PlayerPublicInfo>,
  victimPendingBluffsBefore: string[] | undefined
): void {
  const { actorId, type } = event;

  if (tracker.firstActionType[actorId] === undefined) {
    tracker.firstActionType[actorId] = type;
  }
  tracker.turnsTaken[actorId] = (tracker.turnsTaken[actorId] ?? 0) + 1;
  if (tracker.firstThreePass[actorId] === undefined) tracker.firstThreePass[actorId] = true;
  if (tracker.turnsTaken[actorId] <= 3 && type !== 'pass') {
    tracker.firstThreePass[actorId] = false;
  }

  if (type !== 'kill') {
    tracker.killStreak[actorId] = 0;
    return;
  }

  tracker.killStreak[actorId] = (tracker.killStreak[actorId] ?? 0) + 1;
  if (tracker.killStreak[actorId] >= 5 && newPlayersPublic[actorId]?.alive) {
    tracker.reachedFiveKillStreak[actorId] = true;
  }
  if (event.killWasSelfBluff && event.killWasJoker) {
    tracker.bluffedJoker[actorId] = true;
  }

  if (event.killHit) {
    if (tracker.firstBloodClaimedBy === null) tracker.firstBloodClaimedBy = actorId;

    const victimId = event.killVictimId!;
    const caughtBluff = !!(event.killCardId && victimPendingBluffsBefore?.includes(event.killCardId));
    const victimNowEliminated = prevAlive[victimId] && !newPlayersPublic[victimId]?.alive;

    if (victimNowEliminated) {
      if (!tracker.cardsEliminatedBy[actorId]) tracker.cardsEliminatedBy[actorId] = new Set();
      tracker.cardsEliminatedBy[actorId].add(victimId);

      if (tracker.firstEliminatedPlayerId === null) tracker.firstEliminatedPlayerId = victimId;

      const remainingAlive = Object.values(newPlayersPublic).filter((p) => p.alive).length;
      if (caughtBluff && remainingAlive === 1) {
        tracker.wonByCatchingBluffPlayerId = actorId;
      }
    }
  }
}

// Se llama UNA vez, cuando la partida termina: decide qué logros se ganó
// cada jugador, combinando el tracker de eventos con el estado final y las
// estadísticas acumuladas de la partida.
export function computeMatchAchievements(
  tracker: MatchAchievementTracker,
  finalState: Omit<SyncedGameState, 'pendingAction'>,
  matchStats: Record<string, MatchStatsAccumulator>
): Record<string, AchievementId[]> {
  const grants: Record<string, AchievementId[]> = {};
  const grant = (uid: string, id: AchievementId) => {
    if (!grants[uid]) grants[uid] = [];
    grants[uid].push(id);
  };

  const playerIds = finalState.turnOrder;
  const playerCount = playerIds.length;
  const winnerId = finalState.winnerId;

  for (const uid of playerIds) {
    const pub = finalState.playersPublic[uid];
    const won = uid === winnerId;
    const stats = matchStats[uid];
    const deal = finalState.dealFlags[uid];

    if (won && tracker.bluffedJoker[uid]) grant(uid, 'gran_poja');
    if (tracker.wonByCatchingBluffPlayerId === uid) grant(uid, 'gran_chon');
    if (tracker.reachedFiveKillStreak[uid]) grant(uid, 'no_me_cabe_una');
    if (tracker.firstBloodClaimedBy === uid) grant(uid, 'primera_sangre');
    if (won && playerCount === 6 && pub.handCount === 3) grant(uid, 'masterclass');
    if (stats && stats.killHits >= 3) grant(uid, 'hat_trick');
    if (won && deal?.hadTriple) grant(uid, 'alto_trio');
    if (won && pub.handCount === 1) grant(uid, 'ultima_bala');
    if ((tracker.turnsTaken[uid] ?? 0) >= 3 && tracker.firstThreePass[uid]) grant(uid, 'tipo_humilde');
    if (deal?.hadTwoJokers) grant(uid, 'don_o_maldicion');
    if (playerCount >= 4 && (tracker.cardsEliminatedBy[uid]?.size ?? 0) === playerCount - 1) {
      grant(uid, 'pedazo_de_nashe');
    }
    if (playerCount === 6 && tracker.firstEliminatedPlayerId === uid) grant(uid, 'muy_govir');
  }

  if (playerCount === 6 && playerIds.every((id) => tracker.firstActionType[id] === 'kill')) {
    for (const uid of playerIds) grant(uid, 'ronda_troll');
  }

  return grants;
}

// computeMatchAchievements es seguro de llamar DESPUÉS DE CADA ACCIÓN (no
// solo al final): los logros que necesitan "ganaste la partida" siguen
// dando false hasta que winnerId realmente se defina, así que no hay
// riesgo de que salten antes de tiempo. Esta función compara el resultado
// de la llamada actual contra lo que ya se había notificado antes
// (notified, mutado in-place) y devuelve solo lo NUEVO — eso es lo que
// dispara el popup en pantalla.
export function diffNewAchievements(
  notified: Record<string, Set<AchievementId>>,
  currentGrants: Record<string, AchievementId[]>
): Record<string, AchievementId[]> {
  const fresh: Record<string, AchievementId[]> = {};
  for (const [uid, ids] of Object.entries(currentGrants)) {
    if (!notified[uid]) notified[uid] = new Set();
    const newOnes = ids.filter((id) => !notified[uid].has(id));
    if (newOnes.length > 0) {
      newOnes.forEach((id) => notified[uid].add(id));
      fresh[uid] = newOnes;
    }
  }
  return fresh;
}
