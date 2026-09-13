export type AchievementId =
  | 'gran_poja'
  | 'gran_chon'
  | 'no_me_cabe_una'
  | 'primera_sangre'
  | 'masterclass'
  | 'hat_trick'
  | 'alto_trio'
  | 'ronda_troll'
  | 'snitcher_pro'
  | 'gordo_vicio'
  | 'versero'
  | 'payas_off'
  | 'ultima_bala'
  | 'tipo_humilde'
  | 'don_o_maldicion'
  | 'pedazo_de_nashe'
  | 'muy_govir';

export type AchievementRarity = 'common' | 'rare' | 'legendary';

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  rarity: AchievementRarity;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'gran_poja', name: 'La Gran Poja', description: 'Ganá la partida habiendo bluffeado un Joker.', rarity: 'rare' },
  { id: 'gran_chon', name: 'La Gran Chon', description: 'Ganá la partida cazando un bluff del último rival en pie.', rarity: 'rare' },
  { id: 'no_me_cabe_una', name: 'A mí no me cabe una', description: 'Hacé 5 intentos de KILL seguidos y viví para contarlo.', rarity: 'rare' },
  { id: 'primera_sangre', name: 'Primera Sangre', description: 'Sé el primero en acertar un KILL en la partida.', rarity: 'common' },
  { id: 'masterclass', name: 'Masterclass', description: 'Ganá una partida de 6 personas sin perder ni 1 carta.', rarity: 'legendary' },
  { id: 'hat_trick', name: 'Hat-trick', description: 'Acertá 3 KILLs en una misma partida.', rarity: 'rare' },
  { id: 'alto_trio', name: 'Alto Trío', description: 'Ganá una partida en la que te tocó el mismo número en las 3 cartas.', rarity: 'legendary' },
  { id: 'ronda_troll', name: 'Ronda Troll', description: 'Jugá una partida de 6 en la que todos intenten KILL en la primera ronda.', rarity: 'legendary' },
  { id: 'snitcher_pro', name: 'Snitcher Pro', description: 'Conseguí una racha de 3 victorias seguidas.', rarity: 'rare' },
  { id: 'gordo_vicio', name: 'Gordo Vicio', description: 'Conseguí 30 victorias.', rarity: 'legendary' },
  { id: 'versero', name: 'Versero', description: 'Alcanzá 25 bluffs exitosos.', rarity: 'legendary' },
  { id: 'payas_off', name: 'Payas-off', description: 'Cazá 15 Jokers.', rarity: 'legendary' },
  { id: 'ultima_bala', name: 'Última Bala', description: 'Ganá una partida con 1 sola carta en tu mano.', rarity: 'rare' },
  { id: 'tipo_humilde', name: '¿Qué tipo humilde?', description: 'Pasá tus primeras 3 rondas de la partida.', rarity: 'common' },
  { id: 'don_o_maldicion', name: '¿Don o maldición?', description: 'Recibí 2 Jokers en tu mano al repartir.', rarity: 'rare' },
  {
    id: 'pedazo_de_nashe',
    name: 'Pedazo de Nashe',
    description: 'Eliminá con tus propios KILLs a todos los rivales en una partida de 4 o más.',
    rarity: 'legendary',
  },
  { id: 'muy_govir', name: 'Muy Govir', description: 'Quedá eliminado primero en una partida de 6.', rarity: 'common' },
];
