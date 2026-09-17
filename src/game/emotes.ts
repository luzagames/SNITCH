export interface EmotePhrase {
  id: string;
  text: string;
}

// Frases cortas prearmadas — no hay texto libre a propósito (evita
// mensajes ofensivos sin tener que moderar nada). Elegidas por el
// usuario, no por mí.
export const EMOTE_PHRASES: EmotePhrase[] = [
  { id: 'sos_un_versero', text: 'Sos un versero...' },
  { id: 'me_regale', text: 'Me regalé.' },
  { id: 'volaste', text: 'Volasteee!' },
  { id: 'estas_regalado', text: 'Estás regalado.' },
  { id: 'interrogacion', text: '???' },
  { id: 'hijo_mio', text: 'Hijo mío!' },
  { id: 'f', text: 'f' },
  { id: 'jajaj', text: 'JAJAJ' },
  { id: 'gg', text: 'GG' },
  { id: 'eh', text: 'Eh?' },
  { id: 'gracias', text: 'Gracias!' },
  { id: 'perdon', text: 'Perdón.' },
  { id: 'mala_leche', text: 'Que mala leche...' },
];

export function getEmotePhrase(id: string): EmotePhrase | undefined {
  return EMOTE_PHRASES.find((p) => p.id === id);
}
