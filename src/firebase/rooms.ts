import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O/0/I/1, se confunden

export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isAnonymous: boolean;
}

export type JoinRoomError = 'not_found' | 'full' | 'already_started';

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

// Crea una sala nueva con un código único y agrega al host como primer jugador.
// Reintenta si por casualidad el código generado ya existe (muy poco probable).
export async function createRoom(hostUid: string, hostName: string, isAnonymous: boolean): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const roomRef = doc(db, 'rooms', code);
    const existing = await getDoc(roomRef);
    if (existing.exists()) continue;

    await setDoc(roomRef, {
      hostId: hostUid,
      status: 'lobby',
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'rooms', code, 'players', hostUid), {
      name: hostName,
      isHost: true,
      isAnonymous,
      joinedAt: serverTimestamp(),
    });
    return code;
  }
  throw new Error('No se pudo generar un código de sala único, probá de nuevo.');
}

// Intenta unir a un jugador a una sala existente. Devuelve un código de error
// si no se puede (sala inexistente, llena, o ya empezada) en vez de tirar
// una excepción genérica, para que la UI pueda mostrar el mensaje correcto.
export async function joinRoom(
  code: string,
  uid: string,
  name: string,
  isAnonymous: boolean
): Promise<{ ok: true } | { ok: false; error: JoinRoomError }> {
  const roomRef = doc(db, 'rooms', code);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    return { ok: false, error: 'not_found' };
  }
  if (roomSnap.data().status !== 'lobby') {
    return { ok: false, error: 'already_started' };
  }

  const playersRef = collection(db, 'rooms', code, 'players');

  // Nota MVP: esta lectura de cantidad de jugadores no es atómica con la
  // escritura (Firestore no permite queries dentro de transacciones en el
  // SDK modular). Para un juego casual entre amigos el riesgo de que dos
  // personas entren al mismo tiempo en el último lugar es muy bajo; si se
  // vuelve un problema real, esto se resuelve con una Cloud Function.
  const existingPlayers = await getDocs(playersRef);
  if (existingPlayers.size >= 6) {
    return { ok: false, error: 'full' };
  }

  await setDoc(doc(playersRef, uid), {
    name,
    isHost: false,
    isAnonymous,
    joinedAt: serverTimestamp(),
  });

  return { ok: true };
}

export async function getRoomHostId(code: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'rooms', code));
  return snap.exists() ? (snap.data().hostId as string) : null;
}

// Arma un link que ya incluye el código de sala, para que quien lo recibe
// no tenga que escribirlo a mano — solo abrir el link y tocar UNIRSE.
export function buildInviteLink(code: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('join', code);
  return url.toString();
}

// Usa el selector nativo de "compartir" del celular/navegador si está
// disponible (WhatsApp, Mensajes, etc. aparecen ahí solos). Si no está
// disponible (la mayoría de los navegadores de escritorio), copia el link
// al portapapeles y avisa con el valor de retorno.
export async function shareInviteLink(code: string, hostName: string): Promise<'shared' | 'copied'> {
  const link = buildInviteLink(code);
  const text = `¡Unite a mi partida de SNITCH! Sala de ${hostName}.`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'SNITCH', text, url: link });
      return 'shared';
    } catch {
      // Si cancela el selector nativo, caemos al portapapeles igual.
    }
  }
  await navigator.clipboard.writeText(link);
  return 'copied';
}

export function subscribeToPlayers(code: string, callback: (players: RoomPlayer[]) => void): Unsubscribe {
  const playersRef = collection(db, 'rooms', code, 'players');
  return onSnapshot(playersRef, (snap) => {
    const players = snap.docs.map((d) => ({
      id: d.id,
      name: d.data().name as string,
      isHost: d.data().isHost as boolean,
      isAnonymous: (d.data().isAnonymous as boolean) ?? false,
    }));
    callback(players);
  });
}

export function subscribeToRoomStatus(code: string, callback: (status: string) => void): Unsubscribe {
  return onSnapshot(doc(db, 'rooms', code), (snap) => {
    if (snap.exists()) callback(snap.data().status as string);
  });
}

export async function startRoomGame(code: string): Promise<void> {
  await updateDoc(doc(db, 'rooms', code), { status: 'playing' });
}
