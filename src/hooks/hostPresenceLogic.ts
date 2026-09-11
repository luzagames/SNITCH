// Decide si el último latido conocido del host es lo bastante viejo como
// para considerarlo desconectado. Separado del hook de React que en
// realidad toca Firestore, para poder testear esta decisión de forma
// aislada y confiable.
export function isHostStale(hostLastSeen: number | undefined | null, now: number, thresholdMs: number): boolean {
  // Sin ningún latido registrado (por ejemplo, el jugador host ya ni
  // siquiera está en la lista de la sala) — lo tratamos como desconectado.
  if (hostLastSeen == null) return true;
  return now - hostLastSeen > thresholdMs;
}
