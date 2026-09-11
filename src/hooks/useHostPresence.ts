import { useEffect, useRef, useState } from 'react';
import {
  subscribeToRoom,
  subscribeToPlayers,
  startHeartbeat,
  attemptHostTakeover,
  leaveRoom,
  HOST_STALE_THRESHOLD_MS,
} from '../firebase/rooms';
import type { RoomPlayer } from '../firebase/rooms';
import { isHostStale } from './hostPresenceLogic';

const CHECK_INTERVAL_MS = 5000;

export interface HostPresenceState {
  hostId: string | null;
  isHost: boolean;
  players: RoomPlayer[];
  // Se puso true si en algún momento aparecimos en la lista de jugadores
  // y DESPUÉS desaparecimos — significa que nos expulsaron de la sala de
  // verdad (por desconexión, o porque el host nos sacó). Antes de las
  // Security Rules esto no se notaba (las escrituras seguían "andando" en
  // silencio); ahora Firestore las rechaza, así que hace falta detectarlo
  // explícitamente para sacar a la persona de la pantalla trabada en vez
  // de dejarla mirando errores de permiso sin parar.
  kicked: boolean;
}

// Se usa tanto en el lobby como durante la partida (la desconexión puede
// pasar en cualquiera de los dos momentos). Mientras está montado: manda
// el latido propio, escucha quién es el host EN VIVO (puede cambiar), y:
//
// - Si NO somos el host: vigilamos el latido del host. Si se pone viejo,
//   intentamos tomar la posta (la transacción de attemptHostTakeover se
//   encarga de que, si varios lo intentan a la vez, solo uno gane).
// - Si SÍ somos el host: vigilamos el latido de TODOS los demás
//   jugadores, y sacamos de la sala (de verdad, en Firestore) a
//   cualquiera que lleve demasiado sin latir — así no quedan fantasmas
//   en el lobby ni en la lista, sea host o no.
export function useHostPresence(roomCode: string, uid: string): HostPresenceState {
  const [hostId, setHostId] = useState<string | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [kicked, setKicked] = useState(false);
  const haveSeenSelf = useRef(false);

  useEffect(() => {
    const unsubRoom = subscribeToRoom(roomCode, (info) => setHostId(info.hostId));
    const unsubPlayers = subscribeToPlayers(roomCode, setPlayers);
    const unsubHeartbeat = startHeartbeat(roomCode, uid);
    return () => {
      unsubRoom();
      unsubPlayers();
      unsubHeartbeat();
    };
  }, [roomCode, uid]);

  // No confundir "todavía no llegó la primera respuesta de Firestore" con
  // "nos expulsaron" — solo consideramos que nos echaron si YA nos habíamos
  // visto a nosotros mismos en la lista al menos una vez, y después
  // dejamos de estar.
  useEffect(() => {
    const amIListed = players.some((p) => p.id === uid);
    if (amIListed) {
      haveSeenSelf.current = true;
    } else if (haveSeenSelf.current) {
      setKicked(true);
    }
  }, [players, uid]);

  // No-host: vigilar al host.
  useEffect(() => {
    if (!hostId || hostId === uid) return;

    const interval = setInterval(() => {
      const hostPlayer = players.find((p) => p.id === hostId);
      if (isHostStale(hostPlayer?.lastSeen, Date.now(), HOST_STALE_THRESHOLD_MS)) {
        attemptHostTakeover(roomCode, uid, hostId).catch(() => {});
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [roomCode, uid, hostId, players]);

  // Host: vigilar a todos los demás.
  useEffect(() => {
    if (hostId !== uid) return;

    const interval = setInterval(() => {
      const now = Date.now();
      for (const p of players) {
        if (p.id === uid) continue; // nunca nos sacamos a nosotros mismos
        if (isHostStale(p.lastSeen, now, HOST_STALE_THRESHOLD_MS)) {
          leaveRoom(roomCode, p.id).catch(() => {});
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [roomCode, uid, hostId, players]);

  return { hostId, isHost: hostId === uid, players, kicked };
}
