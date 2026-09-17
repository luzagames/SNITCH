export type AchievementId =
  // Comunes
  | 'primera_sangre'
  | 'tipo_humilde'
  | 'muy_govir'
  | 'don_o_maldicion'
  | 'ultima_bala'
  | 'snitcher_pro'
  | 'ronda_troll'
  | 'par'
  | 'pierna'
  | 'escalera'
  | 'el_que_no_salta'
  | 'son_mas_mejor'
  | 'color'
  | 'six_seven'
  // Raros
  | 'no_me_cabe_una'
  | 'hat_trick'
  | 'alto_trio'
  | 'gordo_vicio'
  | 'versero'
  | 'payas_off'
  | 'en_mi_salsa'
  | 'escalera_color'
  | 'escalera_real'
  | 'el_diablo'
  | 'as_de_diamante'
  | 'aguafiestas'
  // Legendarios
  | 'gran_poja'
  | 'gran_chon'
  | 'masterclass'
  | 'pedazo_de_nashe'
  | 'goat'
  | 'mitomano';

export type AchievementRarity = 'common' | 'rare' | 'legendary';

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  rarity: AchievementRarity;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // --- Comunes ---
  { id: 'primera_sangre', name: 'Primera Sangre', description: 'Sé el primero en acertar un KILL en la partida.', rarity: 'common' },
  { id: 'tipo_humilde', name: '¿Qué tipo humilde?', description: 'Pasá tus primeras 3 rondas de la partida.', rarity: 'common' },
  { id: 'muy_govir', name: 'Muy Govir', description: 'Quedá eliminado primero en una partida de 6.', rarity: 'common' },
  { id: 'don_o_maldicion', name: '¿Don o maldición?', description: 'Recibí 2 Jokers en tu mano al repartir.', rarity: 'common' },
  { id: 'ultima_bala', name: 'Última Bala', description: 'Ganá una partida con 1 sola carta en tu mano.', rarity: 'common' },
  { id: 'snitcher_pro', name: 'Snitcher Pro', description: 'Conseguí una racha de 3 victorias seguidas.', rarity: 'common' },
  {
    id: 'ronda_troll',
    name: 'Ronda Troll',
    description: 'Jugá una partida de 6 en la que todos intenten KILL en la primera ronda.',
    rarity: 'common',
  },
  { id: 'par', name: 'Par', description: 'Recibí 2 cartas del mismo número al repartir.', rarity: 'common' },
  { id: 'pierna', name: 'Pierna', description: 'Recibí 3 cartas con el mismo número al repartir.', rarity: 'common' },
  { id: 'escalera', name: 'Escalera', description: 'Recibí 3 cartas en escalera al repartir.', rarity: 'common' },
  { id: 'el_que_no_salta', name: 'El que no salta...', description: 'Descendé de rango.', rarity: 'common' },
  { id: 'son_mas_mejor', name: 'Son más? Mejor.', description: 'Ganá una partida en una sala de 6 personas.', rarity: 'common' },
  { id: 'color', name: 'Color!', description: 'Recibí 3 cartas del mismo palo al repartir.', rarity: 'common' },
  { id: 'six_seven', name: 'SIX SEVEN', description: 'Recibí un 6 y un 7 en tu mano al repartir.', rarity: 'common' },

  // --- Raros ---
  {
    id: 'no_me_cabe_una',
    name: 'A mí no me cabe una',
    description: 'Hacé 5 intentos de KILL seguidos y viví para contarlo.',
    rarity: 'rare',
  },
  { id: 'hat_trick', name: 'Hat-trick', description: 'Acertá 3 KILLs en una misma partida.', rarity: 'rare' },
  {
    id: 'alto_trio',
    name: 'Alto Trío',
    description: 'Ganá una partida en la que te tocó el mismo número en las 3 cartas.',
    rarity: 'rare',
  },
  { id: 'gordo_vicio', name: 'Gordo Vicio', description: 'Conseguí 30 victorias.', rarity: 'rare' },
  { id: 'versero', name: 'Versero', description: 'Alcanzá 25 bluffs exitosos.', rarity: 'rare' },
  { id: 'payas_off', name: 'Payas-off', description: 'Cazá 15 Jokers.', rarity: 'rare' },
  {
    id: 'en_mi_salsa',
    name: 'En mi salsa',
    description: 'Te tocaron repartidas exactamente las 3 cartas que elegiste como tu mano favorita.',
    rarity: 'rare',
  },
  { id: 'escalera_color', name: 'Escalera y Color!', description: 'Recibí 3 cartas en escalera y del mismo palo al repartir.', rarity: 'rare' },
  { id: 'escalera_real', name: 'Escalera Real', description: 'Recibí A, K y Q del mismo palo al repartir.', rarity: 'rare' },
  { id: 'el_diablo', name: '¡EL DIABLO!', description: 'Recibí 3 cartas del número 6 al repartir.', rarity: 'rare' },
  { id: 'as_de_diamante', name: 'As de Diamante!', description: 'Llegá al rango Diamante.', rarity: 'rare' },
  {
    id: 'aguafiestas',
    name: 'Aguafiestas!',
    description: 'En una partida de 3 o más, sé el único en NO hacer un intento de KILL en la primera ronda.',
    rarity: 'rare',
  },

  // --- Legendarios ---
  { id: 'gran_poja', name: 'La Gran Poja', description: 'Ganá la partida habiendo bluffeado un Joker.', rarity: 'legendary' },
  {
    id: 'gran_chon',
    name: 'La Gran Chon',
    description: 'Ganá la partida cazando un bluff del último rival en pie.',
    rarity: 'legendary',
  },
  { id: 'masterclass', name: 'Masterclass', description: 'Ganá una partida de 6 personas sin perder ni 1 carta.', rarity: 'legendary' },
  {
    id: 'pedazo_de_nashe',
    name: 'Pedazo de Nashe',
    description: 'Eliminá con tus propios KILLs a todos los rivales en una partida de 4 o más.',
    rarity: 'legendary',
  },
  { id: 'goat', name: 'G.O.A.T', description: 'Ganá 100 partidas de SNITCH.', rarity: 'legendary' },
  { id: 'mitomano', name: 'Mitómano', description: 'Realizá 100 bluffs exitosos.', rarity: 'legendary' },
];

// Lo que necesita computeLifetimeAchievements del perfil — un subconjunto
// chico a propósito (no el UserProfile completo), para no tener que
// importar firebase/profile.ts acá y arrastrar su dependencia de
// Firebase a un archivo que se usa también en el motor del juego puro.
export interface LifetimeAchievementInputs {
  currentStreak: number;
  wins: number;
  successfulBluffs: number;
  jokersCaught: number;
}

// Un "rango", para el propósito de esta función — de nuevo, un
// subconjunto chico en vez de importar el tipo Tier completo de
// game/rank.ts, así esta función no depende de nada más que de sí misma.
export interface TierLike {
  id: string;
  minOrdinal: number;
}

// Logros que dependen de números ACUMULADOS de por vida, o del cambio de
// rango de la partida que se acaba de jugar (no de un evento puntual
// durante la partida — esos van por computeMatchAchievements, en
// firebase/gameSyncLogic.ts). Se evalúa contra las estadísticas YA
// actualizadas con la partida que se acaba de jugar.
export function computeLifetimeAchievements(stats: LifetimeAchievementInputs, oldTier: TierLike, newTier: TierLike): AchievementId[] {
  const unlocked: AchievementId[] = [];
  if (stats.currentStreak >= 3) unlocked.push('snitcher_pro');
  if (stats.wins >= 30) unlocked.push('gordo_vicio');
  if (stats.wins >= 100) unlocked.push('goat');
  if (stats.successfulBluffs >= 25) unlocked.push('versero');
  if (stats.successfulBluffs >= 100) unlocked.push('mitomano');
  if (stats.jokersCaught >= 15) unlocked.push('payas_off');
  if (newTier.id === 'diamond') unlocked.push('as_de_diamante');
  if (newTier.minOrdinal < oldTier.minOrdinal) unlocked.push('el_que_no_salta');
  return unlocked;
}
