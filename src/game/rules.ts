import { validateQuestion } from './askQuestions';
import { dealHands } from './deck';
import { cardId } from './types';
import type {
  AskQuestion,
  AskResult,
  Card,
  CardRevealEvent,
  GameState,
  KillResult,
  Player,
} from './types';

export const STARTING_LIVES = 4;
const CARDS_PER_PLAYER = 3;

// ------------------------------------------------------------------
// INICIO DE PARTIDA
// ------------------------------------------------------------------

export function createGame(playerNames: { id: string; name: string }[]): GameState {
  if (playerNames.length < 2 || playerNames.length > 6) {
    throw new Error('SNITCH requiere entre 2 y 6 jugadores');
  }

  const ids = playerNames.map((p) => p.id);
  const hands = dealHands(ids, CARDS_PER_PLAYER);

  const players: Player[] = playerNames.map((p) => ({
    id: p.id,
    name: p.name,
    hand: hands[p.id],
    lives: STARTING_LIVES,
    alive: true,
    isSpectator: false,
  }));

  // Jugador inicial aleatorio; el resto del orden queda fijo
  // (el turno avanza hacia la derecha == siguiente índice en el array).
  const startIndex = Math.floor(Math.random() * players.length);

  return {
    status: 'playing',
    players,
    currentTurnIndex: startIndex,
    history: [],
  };
}

// ------------------------------------------------------------------
// HELPERS DE TURNO
// ------------------------------------------------------------------

function nextAliveIndex(state: GameState, fromIndex: number): number {
  const n = state.players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    if (state.players[idx].alive) return idx;
  }
  // No debería pasar nunca si hay al menos un jugador vivo.
  return fromIndex;
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.currentTurnIndex];
}

function advanceTurn(state: GameState): void {
  state.currentTurnIndex = nextAliveIndex(state, state.currentTurnIndex);
}

// ------------------------------------------------------------------
// ELIMINACIÓN Y VICTORIA
// ------------------------------------------------------------------

function checkAndEliminate(state: GameState, player: Player): void {
  if (!player.alive) return;
  if (player.lives <= 0 || player.hand.length === 0) {
    player.alive = false;
    state.history.push({ type: 'eliminated', playerId: player.id });
  }
}

// Devuelve el id del ganador si la partida terminó, o undefined si sigue.
export function checkVictory(state: GameState): string | undefined {
  const alivePlayers = state.players.filter((p) => p.alive);
  if (alivePlayers.length === 1) {
    state.status = 'finished';
    state.winnerId = alivePlayers[0].id;
    return alivePlayers[0].id;
  }
  return undefined;
}

// ------------------------------------------------------------------
// ACCIÓN: KILL
// ------------------------------------------------------------------
// El jugador de turno elige UNA carta del universo de 52 (no un jugador).
// Si alguien vivo la tiene en su mano, se la descartan (con tease) y,
// si era su última carta, queda eliminado. Si nadie la tiene, el que
// hizo KILL pierde 1 vida.

export function resolveKill(state: GameState, killerId: string, targetCard: Card): KillResult {
  const killer = state.players.find((p) => p.id === killerId);
  if (!killer) throw new Error('Jugador no encontrado');
  if (currentPlayer(state).id !== killerId) {
    throw new Error('No es el turno de este jugador');
  }

  const targetId = cardId(targetCard);

  // Buscamos primero entre los DEMÁS jugadores vivos (sin incluir al
  // killer). Antes se asumía que si el killer tenía la carta, nadie más
  // podía tenerla (el mazo no tenía duplicados) — pero con los 2 Jokers
  // eso ya no es cierto: el killer puede tener un Joker Y otro jugador
  // tener el otro. Por eso buscamos afuera primero, y solo si nadie más
  // la tiene recién ahí miramos si es un bluff sobre la propia mano.
  let hitPlayer: Player | undefined;
  for (const p of state.players) {
    if (!p.alive || p.id === killerId) continue;
    if (p.hand.some((c) => cardId(c) === targetId)) {
      hitPlayer = p;
      break;
    }
  }

  if (!hitPlayer) {
    const isSelfBluff = killer.hand.some((c) => cardId(c) === targetId);

    if (isSelfBluff) {
      killer.lives -= 1;
      checkAndEliminate(state, killer);

      const result: KillResult = {
        killerId,
        targetCard,
        hit: false,
        eliminatedPlayer: !killer.alive,
        heartLost: true,
        selfBluff: true,
      };

      state.history.push({ type: 'kill', result });

      if (!checkVictory(state)) {
        advanceTurn(state);
      }

      return result;
    }
  }

  let result: KillResult;

  if (hitPlayer) {
    // Se descarta la carta de la mano de hitPlayer, con tease previo.
    hitPlayer.hand = hitPlayer.hand.filter((c) => cardId(c) !== targetId);

    const reveal: CardRevealEvent = {
      playerId: hitPlayer.id,
      card: targetCard,
      reason: 'kill',
    };
    state.history.push({ type: 'reveal', result: reveal });

    checkAndEliminate(state, hitPlayer);

    // Nueva regla: acertar un KILL devuelve 1 vida al killer (tope: no
    // puede superar el máximo inicial).
    killer.lives = Math.min(killer.lives + 1, STARTING_LIVES);

    result = {
      killerId,
      targetCard,
      hit: true,
      hitPlayerId: hitPlayer.id,
      eliminatedPlayer: !hitPlayer.alive,
      heartLost: false,
    };
  } else {
    killer.lives -= 1;
    checkAndEliminate(state, killer);

    result = {
      killerId,
      targetCard,
      hit: false,
      eliminatedPlayer: !killer.alive,
      heartLost: true,
    };
  }

  state.history.push({ type: 'kill', result });

  if (!checkVictory(state)) {
    advanceTurn(state);
  }

  return result;
}

// ------------------------------------------------------------------
// ACCIÓN: ASK
// ------------------------------------------------------------------
// Evalúa la pregunta contra la mano de cada jugador vivo EXCEPTO quien
// pregunta. Si nadie cumple, el que preguntó pierde 1 vida.

function matchesQuestion(hand: Card[], q: AskQuestion): boolean {
  switch (q.id) {
    case 'GREATER_THAN':
      return hand.some((c) => c.kind === 'standard' && c.rank > (q.value as number));
    case 'LOWER_THAN':
      return hand.some((c) => c.kind === 'standard' && c.rank < (q.value as number));
    case 'BETWEEN':
      return hand.some((c) => c.kind === 'standard' && c.rank >= (q.min as number) && c.rank <= (q.max as number));
    case 'OF_SUIT':
      return hand.some((c) => c.kind === 'standard' && c.suit === q.suit);
    case 'OF_VALUE':
      return hand.some((c) => c.kind === 'standard' && c.rank === (q.value as number));
    case 'REPEATED_VALUE_IN_HAND': {
      // ¿Tiene dos o más cartas del mismo número en su propia mano? El
      // Joker no tiene número, así que no participa de esta cuenta.
      const seen = new Set<number>();
      for (const c of hand) {
        if (c.kind !== 'standard') continue;
        if (seen.has(c.rank)) return true;
        seen.add(c.rank);
      }
      return false;
    }
    default:
      return false;
  }
}

export function resolveAsk(state: GameState, askerId: string, question: AskQuestion): AskResult {
  const asker = state.players.find((p) => p.id === askerId);
  if (!asker) throw new Error('Jugador no encontrado');
  if (currentPlayer(state).id !== askerId) {
    throw new Error('No es el turno de este jugador');
  }
  validateQuestion(question);

  const answers = state.players
    .filter((p) => p.alive && p.id !== askerId)
    .map((p) => ({ playerId: p.id, matches: matchesQuestion(p.hand, question) }));

  const anyMatch = answers.some((a) => a.matches);

  // Regla actualizada: ASK ya no penaliza con pérdida de vida. Solo KILL
  // fallido cuesta un corazón.
  const result: AskResult = { question, askerId, answers, anyMatch, heartLost: false };
  state.history.push({ type: 'ask', result });

  if (!checkVictory(state)) {
    advanceTurn(state);
  }

  return result;
}

// ------------------------------------------------------------------
// ACCIÓN: PASAR
// ------------------------------------------------------------------
// No cuesta nada ni revela nada: simplemente cede el turno.

export function resolvePass(state: GameState, playerId: string): void {
  if (currentPlayer(state).id !== playerId) {
    throw new Error('No es el turno de este jugador');
  }
  state.history.push({ type: 'pass', playerId });
  advanceTurn(state);
}

// ------------------------------------------------------------------
// ABANDONO DE PARTIDA
// ------------------------------------------------------------------
// Jugador abandona en partida activa -> eliminación inmediata.
// Sus cartas se muestran (tease) una por una y luego se sacan del juego.

export function leaveGame(state: GameState, playerId: string): void {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.alive) return;

  const wasCurrentTurn = currentPlayer(state).id === playerId;

  for (const card of player.hand) {
    state.history.push({
      type: 'reveal',
      result: { playerId, card, reason: 'left_game' },
    });
  }
  player.hand = [];
  player.alive = false;
  player.isSpectator = false; // se va, no queda observando
  state.history.push({ type: 'eliminated', playerId });

  if (!checkVictory(state) && wasCurrentTurn) {
    advanceTurn(state);
  }
}
