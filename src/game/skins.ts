export interface SkinDefinition {
  id: string;
  name: string;
  description: string;
  // Colores de muestra para el selector — deben coincidir con los que
  // están puestos en theme.css bajo :root[data-skin="..."], pero viven
  // acá aparte porque el CSS no se puede leer desde JS sin más vueltas.
  bg: string;
  fg: string;
  accent: string;
  // Opcional: el color de "piel" del avatar, si es distinto del texto
  // general (fg) — como en Bostero, que quiere la piel azul pero el
  // texto normal sigue siendo crema para que se siga leyendo bien. Si no
  // se especifica, se usa fg (ver getAvatarFillColor).
  avatarFill?: string;
  // KILLs exitosos (acertados) de por vida necesarios para desbloquearlo.
  // 0 = siempre disponible.
  killHitsRequired: number;
}

export const DEFAULT_SKIN_ID = 'noir';

// Ordenados por dificultad de desbloqueo (de menos a más KILLs exitosos
// necesarios) — así el selector ya los muestra en un orden que tiene
// sentido como progresión, sin tener que reordenar nada aparte.
export const SKINS: SkinDefinition[] = [
  { id: 'noir', name: 'Noir Clásico', description: 'El de toda la vida.', bg: '#0a0a0a', fg: '#f5f5f0', accent: '#e8291c', killHitsRequired: 0 },
  { id: 'sepia', name: 'Sepia Vintage', description: 'Como una foto vieja de los años 40.', bg: '#2b1d14', fg: '#f0e0c0', accent: '#c9822a', killHitsRequired: 5 },
  { id: 'navidad', name: 'Navideño', description: 'Rojo y verde festivo.', bg: '#0a2818', fg: '#f5f5f0', accent: '#e4293f', killHitsRequired: 10 },
  { id: 'bostero', name: 'Bostero', description: 'Azul y oro, como La Bombonera.', bg: '#0a1f47', fg: '#f5f0dc', accent: '#ffd200', avatarFill: '#3d6bb3', killHitsRequired: 12 },
  { id: 'halloween', name: 'Halloween', description: 'Negro y naranja, con onda espeluznante.', bg: '#0d0500', fg: '#f5ead5', accent: '#ff8800', killHitsRequired: 15 },
  { id: 'miami', name: 'Miami Vice', description: 'Colorido, con onda tropical.', bg: '#0a2e36', fg: '#e8fbff', accent: '#ff6ec7', killHitsRequired: 20 },
  { id: 'seleccion', name: 'Selección Argentina', description: 'Celeste y blanco.', bg: '#0a1a2e', fg: '#ffffff', accent: '#75aadb', killHitsRequired: 22 },
  { id: 'western', name: 'Western', description: 'Tonos tierra, como un cartel de "se busca".', bg: '#2e2417', fg: '#e8dcc0', accent: '#a0522d', killHitsRequired: 40 },
  { id: 'neon', name: 'Neón Synthwave', description: 'Detective de los 80 con luces de neón.', bg: '#120821', fg: '#f0e6ff', accent: '#00fff5', killHitsRequired: 50 },
  { id: 'blade_runner', name: 'Blade Runner', description: 'Contraste azul y naranja, futurista.', bg: '#0a1220', fg: '#c8d8e8', accent: '#ff7a1a', killHitsRequired: 60 },
  { id: 'blood_moon', name: 'Blood Moon', description: 'Rojo sangre oscuro, más gótico.', bg: '#150505', fg: '#e8d5d5', accent: '#b3001b', killHitsRequired: 70 },
  { id: 'matrix', name: 'Matrix Hacker', description: 'Terminal verde monocromático.', bg: '#050805', fg: '#c8ffd4', accent: '#00ff41', killHitsRequired: 90 },
  { id: 'gameboy', name: 'Game Boy', description: 'Los 4 tonos de verde de la consola original.', bg: '#0f380f', fg: '#9bbc0f', accent: '#8bac0f', killHitsRequired: 100 },
];

export function getSkinById(id: string): SkinDefinition {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function getAvatarFillColor(skin: SkinDefinition): string {
  return skin.avatarFill ?? skin.fg;
}

export function getUnlockedSkins(killHits: number): SkinDefinition[] {
  return SKINS.filter((s) => killHits >= s.killHitsRequired);
}
