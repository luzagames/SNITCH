import { doc, setDoc, getDoc, updateDoc, getDocs, collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from './config';
import {
  buildInitialSyncedState,
  applyPendingAction,
  applyStatsEvent,
  finalizeBluffStats,
  createAchievementTracker,
  trackAchievementEvent,
  computeMatchAchievements,
  diffNewAchievements,
} from './gameSyncLogic';
import type { PendingAction, SyncedGameState, MatchStatsAccumulator } from './gameSyncLogic';
import type { Card } from '../game/types';
import type { AchievementId } from '../game/achievements';
import { getProfile } from './profile';
import { subscribeToPlayers, HOST_STALE_THRESHOLD_MS } from './rooms';
import type { RoomPlayer } from './rooms';
import { isHostStale } from '../hooks/hostPresenceLogic';

export type { PendingAction, SyncedGameState, PlayerPublicInfo, MatchStatsAccumulator } from './gameSyncLogic';

const DISCONNECTION_CHECK_INTERVAL_MS = 5000;

function gameStateRef(roomCode: string) {
  return doc(db, 'rooms', roomCode, 'gameState', 'current');
}

function handRef(roomCode: string, uid: string) {
  return doc(db, 'rooms', roomCode, 'hands', uid);
}

// Se llama UNA vez, del lado del host, cuando arranca la partida.
export async function dealAndStartGame(roomCode: string, players: { id: string; name: string; isAnonymous: boolean }[]) {
  const { state, hands } = buildInitialSyncedState(players);

  for (const [uid, cards] of Object.entries(hands)) {
    await setDoc(handRef(roomCode, uid), { cards });
  }
  await setDoc(gameStateRef(roomCode), { ...state, pendingAction: null } satisfies SyncedGameState);
  await updateDoc(doc(db, 'rooms', roomCode), { status: 'playing' });
}

export function subscribeToGameState(roomCode: string, callback: (gs: SyncedGameState) => void): Unsubscribe {
  return onSnapshot(gameStateRef(roomCode), (snap) => {
    if (snap.exists()) callback(snap.data() as SyncedGameState);
  });
}

export function subscribeToOwnHand(roomCode: string, uid: string, callback: (cards: Card[]) => void): Unsubscribe {
  return onSnapshot(handRef(roomCode, uid), (snap) => {
    callback(snap.exists() ? (snap.data().cards as Card[]) : []);
  });
}

// Un jugador eliminado/espectador se va de la sala. Esto es solo un
// mensaje informativo (no toca vidas, cartas ni turnos) — por eso, a
// diferencia de KILL/ASK/PASAR, no pasa por el árbitro: cualquier cliente
// puede escribirlo directo, como ya hacemos con el resto de la sala.
export async function announcePlayerLeft(roomCode: string, playerName: string): Promise<void> {
  await updateDoc(gameStateRef(roomCode), { lastMessage: `${playerName} abandonó la partida.` });
}

// Cualquier jugador llama esto en su turno: no resuelve nada localmente,
// solo "pide" la acción. El navegador del host es quien la procesa.
export async function submitAction(roomCode: string, action: PendingAction) {
  await updateDoc(gameStateRef(roomCode), { pendingAction: action });
}

// SOLO se ejecuta en el navegador del host. Ver gameSyncLogic.ts para la
// lógica real de resolución (testeada aparte, sin Firestore).
//
// Además de resolver cada acción, este es el único lugar que lleva la
// cuenta de las estadísticas de TODA la partida (quién bluffeó con qué
// carta, cuántos KILL acertó cada uno, etc.) — vive en la memoria del
// navegador del host, nunca se escribe en un lugar público, hasta que la
// partida termina y recién ahí se manda un resumen final por jugador.
export function startHostReferee(roomCode: string): Unsubscribe {
  let resolving = false;
  let seeded = false;
  const statsAcc: Record<string, MatchStatsAccumulator> = {};
  const pendingBluffs: Record<string, string[]> = {};
  const achievementTracker = createAchievementTracker();
  const notifiedAchievements: Record<string, Set<AchievementId>> = {};

  // Se van actualizando con cada suscripción — el chequeo de desconexión
  // (más abajo) los usa para decidir si ya no queda competencia real.
  let latestGs: SyncedGameState | null = null;
  let latestPlayers: RoomPlayer[] = [];

  // Chequeo de seguridad compartido: si para cuando vamos a escribir ya
  // arrancó una partida MÁS NUEVA en esta misma sala (por ejemplo, alguien
  // tocó "Jugar de nuevo" y el host ya repartió de vuelta), la escritura
  // quedó obsoleta — la descartamos en vez de pisar el estado fresco.
  async function isStillCurrentMatch(expectedStartedAt: number): Promise<boolean> {
    const freshSnap = await getDoc(gameStateRef(roomCode));
    const freshStartedAt = freshSnap.exists() ? (freshSnap.data() as SyncedGameState).startedAt : null;
    return freshStartedAt === expectedStartedAt;
  }

  const unsubGameState = onSnapshot(gameStateRef(roomCode), async (snap) => {
    if (!snap.exists()) return;
    const gs = snap.data() as SyncedGameState;
    latestGs = gs;

    // Antes de procesar cualquier acción, consultamos el perfil REAL de
    // cada jugador no-anónimo, para que el popup en vivo solo avise de
    // logros genuinamente NUEVOS — si ya tenían "Primera Sangre" de una
    // partida anterior, conseguirla de nuevo acá no debe re-notificar.
    if (!seeded) {
      seeded = true;
      for (const uid of gs.turnOrder) {
        if (gs.isAnonymous[uid]) continue;
        const profile = await getProfile(uid).catch(() => null);
        notifiedAchievements[uid] = new Set(profile?.achievements ?? []);
      }
    }

    if (!gs.pendingAction || resolving) return;

    resolving = true;
    try {
      const handsSnap = await getDocs(collection(db, 'rooms', roomCode, 'hands'));
      const handsByUid: Record<string, Card[]> = {};
      handsSnap.forEach((d) => {
        handsByUid[d.id] = d.data().cards as Card[];
      });

      const prevAlive: Record<string, boolean> = {};
      for (const [uid, info] of Object.entries(gs.playersPublic)) prevAlive[uid] = info.alive;

      const { newState, changedHands, statsEvent } = applyPendingAction(gs, handsByUid);

      // Capturamos los bluffs pendientes de la víctima ANTES de que
      // applyStatsEvent los actualice, para poder detectar "esto justo
      // cachó un bluff" en el rastreador de logros.
      const victimPendingBefore = statsEvent.killVictimId
        ? [...(pendingBluffs[statsEvent.killVictimId] ?? [])]
        : undefined;

      applyStatsEvent(statsAcc, pendingBluffs, statsEvent);
      trackAchievementEvent(achievementTracker, statsEvent, prevAlive, newState.playersPublic, victimPendingBefore);

      // Chequeamos logros después de CADA acción, no solo al final: los que
      // necesitan "ganaste la partida" van a seguir dando false hasta que
      // winnerId se defina de verdad, así que no hay riesgo de que salten
      // antes de tiempo. Lo nuevo que aparece acá dispara el popup en vivo.
      const currentGrants = computeMatchAchievements(achievementTracker, newState, statsAcc);
      const fresh = diffNewAchievements(notifiedAchievements, currentGrants);
      if (Object.keys(fresh).length > 0) {
        newState.liveAchievementEvent = { grants: fresh, eventAt: Date.now() };
      }

      if (newState.status === 'finished') {
        finalizeBluffStats(statsAcc, pendingBluffs);
        newState.finalStats = { ...statsAcc };
        newState.finalAchievements = currentGrants;
      }

      if (!(await isStillCurrentMatch(gs.startedAt))) return;

      await setDoc(gameStateRef(roomCode), { ...newState, pendingAction: null } satisfies SyncedGameState);
      latestGs = { ...newState, pendingAction: null };

      for (const [uid, cards] of Object.entries(changedHands)) {
        await setDoc(handRef(roomCode, uid), { cards });
      }
    } finally {
      resolving = false;
    }
  });

  const unsubPlayers = subscribeToPlayers(roomCode, (players) => {
    latestPlayers = players;
  });

  // Un jugador desconectado tiene la MISMA consideración que uno
  // eliminado para decidir quién gana — a menos que se vuelva a conectar
  // antes de que esto se evalúe. Si de los jugadores VIVOS solo queda uno
  // realmente conectado, ese gana ahí mismo, sin esperar a que los demás
  // vuelvan (que puede que nunca pase).
  const disconnectionCheck = setInterval(async () => {
    if (resolving || !latestGs || latestGs.status !== 'playing' || latestGs.pendingAction) return;

    const gs = latestGs;
    const aliveIds = gs.turnOrder.filter((id) => gs.playersPublic[id].alive);
    if (aliveIds.length <= 1) return; // esto ya lo resuelve el flujo normal de KILL

    const now = Date.now();
    const stillContending = aliveIds.filter((id) => {
      const p = latestPlayers.find((pl) => pl.id === id);
      return !isHostStale(p?.lastSeen, now, HOST_STALE_THRESHOLD_MS);
    });
    if (stillContending.length !== 1) return;

    const winnerId = stillContending[0];
    resolving = true;
    try {
      if (!(await isStillCurrentMatch(gs.startedAt))) return;

      finalizeBluffStats(statsAcc, pendingBluffs);
      const finished: Omit<SyncedGameState, 'pendingAction'> = {
        ...gs,
        status: 'finished',
        winnerId,
        lastMessage: `${gs.playersPublic[winnerId].name} gana — el resto quedó desconectado.`,
      };
      const finalAchievements = computeMatchAchievements(achievementTracker, finished, statsAcc);
      finished.finalStats = { ...statsAcc };
      finished.finalAchievements = finalAchievements;

      await setDoc(gameStateRef(roomCode), { ...finished, pendingAction: null } satisfies SyncedGameState);
      latestGs = { ...finished, pendingAction: null };
    } finally {
      resolving = false;
    }
  }, DISCONNECTION_CHECK_INTERVAL_MS);

  return () => {
    unsubGameState();
    unsubPlayers();
    clearInterval(disconnectionCheck);
  };
}
