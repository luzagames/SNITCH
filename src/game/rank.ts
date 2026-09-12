import { rating, rate, ordinal as openskillOrdinal } from 'openskill';

// Representación de una curva de habilidad: mu = habilidad estimada,
// sigma = qué tan segura está el sistema de esa estimación. Arranca muy
// incierto (sigma alto) y se va afinando con cada partida.
export interface SkillRating {
  mu: number;
  sigma: number;
}

export const DEFAULT_SKILL: SkillRating = rating();

// El número "de verdad" para mostrar/ordenar: mu menos 3 desvíos, un piso
// conservador de tu habilidad real. Por diseño, sube más rápido al
// principio (a medida que el sistema se saca la incertidumbre de encima)
// y después se estabiliza según qué tan seguido ganás de verdad.
export function skillOrdinal(skill: SkillRating): number {
  return openskillOrdinal(skill);
}

export interface Tier {
  id: string;
  name: string;
  minOrdinal: number;
  // Los dos tonos de la gemita del distintivo (ver RankGemIcon.tsx).
  light: string;
  dark: string;
}

// Calibrado simulando partidas de distinta habilidad (ver la sesión de
// diseño) — un jugador de habilidad PROMEDIO, después de varias decenas
// de partidas, termina asentado en Oro. Como toda calibración inicial sin
// datos reales todavía, puede necesitar un ajuste más adelante.
export const TIERS: Tier[] = [
  { id: 'bronze', name: 'Bronce', minOrdinal: -Infinity, light: '#D99E5C', dark: '#B87A3D' },
  { id: 'silver', name: 'Plata', minOrdinal: 6, light: '#D7D7D7', dark: '#A8A8A8' },
  { id: 'gold', name: 'Oro', minOrdinal: 13, light: '#FFE066', dark: '#E0A92E' },
  { id: 'platinum', name: 'Platino', minOrdinal: 20, light: '#CDEAF0', dark: '#9FC9D6' },
  // Los tonos exactos del sprite original que armaste.
  { id: 'diamond', name: 'Diamante', minOrdinal: 27, light: '#92FCE6', dark: '#8CE8D5' },
];

export function getTier(ordinalValue: number): Tier {
  let result = TIERS[0];
  for (const t of TIERS) {
    if (ordinalValue >= t.minOrdinal) result = t;
  }
  return result;
}

// El rango inmediatamente por encima del actual, o null si ya estás en
// el más alto (Diamante) — no hay a dónde "subir" desde ahí.
export function getNextTier(currentTierId: string): Tier | null {
  const index = TIERS.findIndex((t) => t.id === currentTierId);
  if (index === -1 || index === TIERS.length - 1) return null;
  return TIERS[index + 1];
}

// Actualiza el rating de TODOS los participantes de una partida a la vez,
// dado el orden final de llegada (el primero de la lista es el ganador).
// Devuelve los ratings actualizados en ese MISMO orden.
export function updateSkillRatings(orderedSkills: SkillRating[]): SkillRating[] {
  const teams = orderedSkills.map((s) => [s]);
  const updated = rate(teams);
  return updated.map((team) => team[0]);
}

// Reconstruye el orden de llegada completo (1ro a último) a partir de
// quién ganó y el orden en que fueron cayendo los demás. El último en
// eliminationOrder fue el penúltimo en pie (2do lugar); el primero en
// eliminationOrder fue el primero eliminado (último lugar).
export function computeFinalPlacement(winnerId: string, eliminationOrder: string[]): string[] {
  return [winnerId, ...[...eliminationOrder].reverse()];
}
