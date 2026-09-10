import { createGame, resolveKill, resolveAsk, resolvePass } from '../game/rules';
import { cardLabel } from '../game/display';
import { questionLabel } from '../game/askQuestions';
import type { AskQuestion, Card, GameState } from '../game/types';

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
}

// Arma el SyncedGameState inicial (llamado al arrancar la partida).
export function buildInitialSyncedState(players: { id: string; name: string }[]): {
  state: Omit<SyncedGameState, 'pendingAction'>;
  hands: Record<string, Card[]>;
} {
  const engineState = createGame(players);
  const playersPublic: Record<string, PlayerPublicInfo> = {};
  const hands: Record<string, Card[]> = {};
  for (const p of engineState.players) {
    playersPublic[p.id] = { name: p.name, lives: p.lives, alive: p.alive, handCount: p.hand.length };
    hands[p.id] = p.hand;
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
): { newState: Omit<SyncedGameState, 'pendingAction'>; changedHands: Record<string, Card[]> } {
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

  if (action.type === 'kill') {
    const result = resolveKill(engineState, action.actorId, action.card);
    const actorName = gs.playersPublic[action.actorId].name;
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
    // ASK ya no tiene penalización, así que el mensaje es siempre el mismo
    // independientemente de si alguien respondió ✓ o no.
    message = `${actorName} preguntó: "${questionLabel(action.question)}"`;
  } else {
    resolvePass(engineState, action.actorId);
    const actorName = gs.playersPublic[action.actorId].name;
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
    },
    changedHands,
  };
}
