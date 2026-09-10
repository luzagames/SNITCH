import { doc, setDoc, updateDoc, getDocs, collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from './config';
import { buildInitialSyncedState, applyPendingAction } from './gameSyncLogic';
import type { PendingAction, SyncedGameState } from './gameSyncLogic';
import type { Card } from '../game/types';

export type { PendingAction, SyncedGameState, PlayerPublicInfo } from './gameSyncLogic';

function gameStateRef(roomCode: string) {
  return doc(db, 'rooms', roomCode, 'gameState', 'current');
}

function handRef(roomCode: string, uid: string) {
  return doc(db, 'rooms', roomCode, 'hands', uid);
}

// Se llama UNA vez, del lado del host, cuando arranca la partida.
export async function dealAndStartGame(roomCode: string, players: { id: string; name: string }[]) {
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

// Cualquier jugador llama esto en su turno: no resuelve nada localmente,
// solo "pide" la acción. El navegador del host es quien la procesa.
export async function submitAction(roomCode: string, action: PendingAction) {
  await updateDoc(gameStateRef(roomCode), { pendingAction: action });
}

// SOLO se ejecuta en el navegador del host. Ver gameSyncLogic.ts para la
// lógica real de resolución (testeada aparte, sin Firestore).
export function startHostReferee(roomCode: string): Unsubscribe {
  let resolving = false;

  return onSnapshot(gameStateRef(roomCode), async (snap) => {
    if (!snap.exists()) return;
    const gs = snap.data() as SyncedGameState;
    if (!gs.pendingAction || resolving) return;

    resolving = true;
    try {
      const handsSnap = await getDocs(collection(db, 'rooms', roomCode, 'hands'));
      const handsByUid: Record<string, Card[]> = {};
      handsSnap.forEach((d) => {
        handsByUid[d.id] = d.data().cards as Card[];
      });

      const { newState, changedHands } = applyPendingAction(gs, handsByUid);

      await setDoc(gameStateRef(roomCode), { ...newState, pendingAction: null } satisfies SyncedGameState);

      for (const [uid, cards] of Object.entries(changedHands)) {
        await setDoc(handRef(roomCode, uid), { cards });
      }
    } finally {
      resolving = false;
    }
  });
}
