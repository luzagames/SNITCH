import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SKIN_ID, SKINS } from '../game/skins';

const STORAGE_KEY = 'snitch-skin';

function isValidSkinId(id: string | null): id is string {
  return id !== null && SKINS.some((s) => s.id === id);
}

// El skin es una preferencia del DISPOSITIVO/navegador (como el volumen o
// el brillo), no de la cuenta — por eso vive en localStorage y no en el
// perfil de Firestore. Se aplica escribiendo un atributo data-skin en
// <html>, que es lo que theme.css usa para elegir qué bloque de
// variables CSS mostrar (ver :root[data-skin="..."] ahí).
function applySkinToDocument(id: string) {
  if (id === DEFAULT_SKIN_ID) {
    document.documentElement.removeAttribute('data-skin');
  } else {
    document.documentElement.setAttribute('data-skin', id);
  }
}

// Se llama UNA vez, lo antes posible al arrancar la app (en SnitchApp),
// para que el skin guardado se aplique antes de que el usuario llegue a
// ver ninguna pantalla — evita el "flash" del skin por defecto.
export function applyStoredSkinOnBoot(): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (isValidSkinId(stored)) applySkinToDocument(stored);
}

// Para usar en lugares que no son componentes de React (como rooms.ts al
// crear/unirse a una sala) — lee el skin guardado sin necesitar el hook.
export function getStoredSkinId(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isValidSkinId(stored) ? stored : DEFAULT_SKIN_ID;
}

export function useSkin(): { skinId: string; setSkinId: (id: string) => void } {
  const [skinId, setSkinIdState] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isValidSkinId(stored) ? stored : DEFAULT_SKIN_ID;
  });

  useEffect(() => {
    applySkinToDocument(skinId);
  }, [skinId]);

  const setSkinId = useCallback((id: string) => {
    setSkinIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return { skinId, setSkinId };
}
