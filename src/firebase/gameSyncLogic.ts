import { createGame, resolveKill, resolveAsk } from '../game/rules';
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
  | { type: 'ask'; actorId: string; question: AskQuestion };

export interface SyncedGameState {
  status: 'playing' | 'finished';
  turnOrder: string[];
  currentTurnIndex: number;
  playersPublic: Record<string, PlayerPublicInfo>;
  winnerId: string | null;
  lastMessage: string;
  lastAnswers: { playerId: string; matches: boolean }[] | null;
  pendingAction: PendingAction | null;
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

  if (action.type === 'kill') {
    const result = resolveKill(engineState, action.actorId, action.card);
    const actorName = gs.playersPublic[action.actorId].name;
    if (result.selfBluff) {
      message = `${actorName} bluffeó con ${cardLabel(action.card)}. Perdió 1 corazón, pero la conserva.`;
    } else if (result.hit) {
      message = `¡Impacto! ${gs.playersPublic[result.hitPlayerId!].name} tenía ${cardLabel(action.card)}.`;
    } else {
      message = `Nadie tenía ${cardLabel(action.card)}. ${actorName} perdió 1 corazón.`;
    }
  } else {
    const result = resolveAsk(engineState, action.actorId, action.question);
    const actorName = gs.playersPublic[action.actorId].name;
    lastAnswers = result.answers;
    message = result.anyMatch
      ? `${actorName} preguntó: "${questionLabel(action.question)}"`
      : `${actorName} preguntó: "${questionLabel(action.question)}" — nadie respondió ✓, perdió 1 corazón.`;
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
    },
    changedHands,
  };
}
