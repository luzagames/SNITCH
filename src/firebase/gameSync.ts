import { doc, setDoc, updateDoc, getDocs, collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
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

export type { PendingAction, SyncedGameState, PlayerPublicInfo, MatchStatsAccumulator } from './gameSyncLogic';

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

  return onSnapshot(gameStateRef(roomCode), async (snap) => {
    if (!snap.exists()) return;
    const gs = snap.data() as SyncedGameState;

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

      await setDoc(gameStateRef(roomCode), { ...newState, pendingAction: null } satisfies SyncedGameState);

      for (const [uid, cards] of Object.entries(changedHands)) {
        await setDoc(handRef(roomCode, uid), { cards });
      }
    } finally {
      resolving = false;
    }
  });
}
