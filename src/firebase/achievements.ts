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

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'gran_poja', name: 'La Gran Poja', description: 'Ganá la partida habiendo bluffeado un Joker.' },
  { id: 'gran_chon', name: 'La Gran Chon', description: 'Ganá la partida cazando un bluff del último rival en pie.' },
  { id: 'no_me_cabe_una', name: 'A mí no me cabe una', description: 'Hacé 5 intentos de KILL seguidos y viví para contarlo.' },
  { id: 'primera_sangre', name: 'Primera Sangre', description: 'Sé el primero en acertar un KILL en la partida.' },
  { id: 'masterclass', name: 'Masterclass', description: 'Ganá una partida de 6 personas sin perder ni 1 carta.' },
  { id: 'hat_trick', name: 'Hat-trick', description: 'Acertá 3 KILLs en una misma partida.' },
  { id: 'alto_trio', name: 'Alto Trío', description: 'Ganá una partida en la que te tocó el mismo número en las 3 cartas.' },
  { id: 'ronda_troll', name: 'Ronda Troll', description: 'Jugá una partida de 6 en la que todos intenten KILL en la primera ronda.' },
  { id: 'snitcher_pro', name: 'Snitcher Pro', description: 'Conseguí una racha de 3 victorias seguidas.' },
  { id: 'gordo_vicio', name: 'Gordo Vicio', description: 'Conseguí 30 victorias.' },
  { id: 'versero', name: 'Versero', description: 'Alcanzá 25 bluffs exitosos.' },
  { id: 'payas_off', name: 'Payas-off', description: 'Cazá 15 Jokers.' },
  { id: 'ultima_bala', name: 'Última Bala', description: 'Ganá una partida con 1 sola carta en tu mano.' },
  { id: 'tipo_humilde', name: '¿Qué tipo humilde?', description: 'Pasá tus primeras 3 rondas de la partida.' },
  { id: 'don_o_maldicion', name: '¿Don o maldición?', description: 'Recibí 2 Jokers en tu mano al repartir.' },
  { id: 'pedazo_de_nashe', name: 'Pedazo de Nashe', description: 'Eliminá con tus propios KILLs a todos los rivales en una partida de 4 o más.' },
  { id: 'muy_govir', name: 'Muy Govir', description: 'Quedá eliminado primero en una partida de 6.' },
];
