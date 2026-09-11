import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  runTransaction,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O/0/I/1, se confunden

// Cada cuánto manda cada jugador su "sigo acá" a Firestore.
export const HEARTBEAT_INTERVAL_MS = 8000;
// Cuánto tiempo sin latido del host hace falta para considerarlo
// desconectado. Bastante más que el intervalo de latido, para no
// confundir un hipo de red pasajero con una desconexión real.
export const HOST_STALE_THRESHOLD_MS = 20000;

export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isAnonymous: boolean;
  lastSeen: number;
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
      lastSeen: Date.now(),
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
    lastSeen: Date.now(),
  });

  return { ok: true };
}

export async function getRoomHostId(code: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'rooms', code));
  return snap.exists() ? (snap.data().hostId as string) : null;
}

// Se usa al abrir la app para decidir si hay que reconectar a una sala
// guardada (ver src/utils/roomPersistence.ts). Confirma dos cosas: que la
// sala siga existiendo, Y que este jugador puntual siga en su lista de
// miembros (si se desconectó demasiado tiempo, el sistema de latido ya lo
// habrá sacado — en ese caso, correctamente, NO hay que reconectar).
export async function checkRoomMembership(code: string, uid: string): Promise<{ valid: boolean; status: string | null }> {
  const roomSnap = await getDoc(doc(db, 'rooms', code));
  if (!roomSnap.exists()) return { valid: false, status: null };

  const playerSnap = await getDoc(doc(db, 'rooms', code, 'players', uid));
  if (!playerSnap.exists()) return { valid: false, status: null };

  return { valid: true, status: roomSnap.data().status as string };
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
      lastSeen: (d.data().lastSeen as number) ?? 0,
    }));
    callback(players);
  });
}

// Reemplaza a la vieja subscribeToRoomStatus: además del estado, ahora
// también avisa quién es el host EN VIVO — necesario porque, con la
// herencia de árbitro, el host puede cambiar en cualquier momento sin que
// la sala deje de existir ni cambie de estado.
export function subscribeToRoom(code: string, callback: (info: { status: string; hostId: string }) => void): Unsubscribe {
  return onSnapshot(doc(db, 'rooms', code), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      callback({ status: data.status as string, hostId: data.hostId as string });
    }
  });
}

export async function startRoomGame(code: string): Promise<void> {
  await updateDoc(doc(db, 'rooms', code), { status: 'playing' });
}

// Se llama al tocar "JUGAR DE NUEVO" desde la pantalla de victoria. Solo
// vuelve la SALA al estado de lobby — no toca gameState/current para nada
// (dealAndStartGame ya sobreescribe ese documento entero, sin merge, la
// próxima vez que el host arranque la partida, así que no hace falta
// limpiar nada a mano acá).
export async function resetRoomToLobby(code: string): Promise<void> {
  await updateDoc(doc(db, 'rooms', code), { status: 'lobby' });
}

// Saca al jugador de la lista real de la sala (no solo de su propia
// pantalla) — así, si el host arranca otra partida después, no lo arrastra
// como un jugador "fantasma" que ya no está activo.
export async function leaveRoom(code: string, uid: string): Promise<void> {
  await deleteDoc(doc(db, 'rooms', code, 'players', uid));
}

// ------------------------------------------------------------------
// HERENCIA DE ÁRBITRO
// ------------------------------------------------------------------
// Si el host cierra la app o pierde la conexión a mitad de partida, nadie
// queda escuchando pendingAction — el juego se traba para siempre. Estas
// dos funciones, junto con el hook useHostPresence, resuelven eso: todo el
// mundo manda su propio latido, y si el del host se pone viejo, cualquier
// otro jugador puede tomar la posta.

// Escribe el "sigo acá" del jugador cada HEARTBEAT_INTERVAL_MS, mientras
// esté montado (lobby O partida — la desconexión puede pasar en cualquiera
// de los dos momentos). Escribe una vez de entrada, no hay que esperar el
// primer intervalo para que quede registrado.
export function startHeartbeat(code: string, uid: string): Unsubscribe {
  const ref = doc(db, 'rooms', code, 'players', uid);
  const write = () => {
    updateDoc(ref, { lastSeen: Date.now() }).catch(() => {
      // Si falla (por ejemplo, porque este jugador ya no está en la sala),
      // no hay nada que hacer — el próximo intervalo lo vuelve a intentar.
    });
  };
  write();
  const interval = setInterval(write, HEARTBEAT_INTERVAL_MS);
  return () => clearInterval(interval);
}

// Intenta tomar la posta como nuevo host. Usa una transacción para que, si
// varios jugadores lo intentan al mismo tiempo (todos vieron al host viejo
// como desconectado a la vez), solo UNO gane — los demás simplemente no
// hacen nada, sin necesidad de coordinarse entre ellos.
//
// staleHostId es el host que CREÍAMOS desconectado al momento de decidir
// intentar esto — si para cuando la transacción corre el host real ya es
// otro (alguien más ganó la carrera, o el host viejo en realidad seguía
// vivo y su propio latido ya se actualizó... aunque eso no cambia
// hostId), la transacción aborta sola y devuelve false.
//
// OJO: NO tocamos el documento del host viejo acá (a propósito). Si ese
// jugador ya se fue de la sala con el botón de abandonar, su documento ya
// no existe — e intentar escribirle algo a un documento ajeno que no
// existe cuenta como "crear" para las reglas de seguridad, y las reglas
// correctamente lo rechazan (solo podés crear tu PROPIO documento). No
// hace falta igual: quién es host se decide mirando hostId de la sala en
// vivo, no el campo isHost de cada jugador — ese campo quedó solo para
// referencia visual, no es la fuente de verdad.
export async function attemptHostTakeover(code: string, uid: string, staleHostId: string): Promise<boolean> {
  const roomRef = doc(db, 'rooms', code);
  const newHostPlayerRef = doc(db, 'rooms', code, 'players', uid);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists() || snap.data().hostId !== staleHostId) {
      return false; // alguien ya tomó la posta, o la sala ya no existe
    }
    tx.update(roomRef, { hostId: uid });
    tx.set(newHostPlayerRef, { isHost: true }, { merge: true });
    return true;
  });
}
