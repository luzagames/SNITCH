// Guarda en el navegador (no en el servidor) en qué sala estabas, para
// poder volver directo ahí si recargás la página o cerrás la pestaña por
// error y la volvés a abrir. No hace falta un tiempo límite explícito acá
// — si pasó demasiado tiempo, el sistema de latido ya te habrá sacado de
// la sala del lado del servidor, y checkRoomMembership() simplemente va a
// decir que ya no sos miembro.
const STORAGE_KEY = 'snitch_active_room';

interface StoredRoom {
  roomCode: string;
  uid: string;
}

export function saveActiveRoom(roomCode: string, uid: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ roomCode, uid } satisfies StoredRoom));
  } catch {
    // localStorage puede fallar (modo privado, cupo lleno, etc.) — no es
    // grave, simplemente esa vez no habrá reconexión automática.
  }
}

// Devuelve el código guardado SOLO si es de la MISMA cuenta que está
// logueada ahora — evita reconectar a la sala de otra persona si el
// navegador se comparte entre cuentas.
export function getSavedActiveRoom(uid: string): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRoom;
    return parsed.uid === uid ? parsed.roomCode : null;
  } catch {
    return null;
  }
}

export function clearActiveRoom(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorar
  }
}
