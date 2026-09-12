import { getTier, getNextTier, TIERS, computeFinalPlacement, updateSkillRatings, skillOrdinal, DEFAULT_SKILL } from '../src/game/rank';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FALLÓ: ' + msg);
  console.log('OK:', msg);
}

// --- computeFinalPlacement: reconstruye el orden completo ---
{
  // p4 fue el primero eliminado, p3 después, p2 el último antes de que
  // terminara la partida — p1 ganó.
  const placement = computeFinalPlacement('p1', ['p4', 'p3', 'p2']);
  assert(JSON.stringify(placement) === JSON.stringify(['p1', 'p2', 'p3', 'p4']), 'Orden de llegada reconstruido correctamente (ganador primero, primero-eliminado al final)');
}
{
  // Partida 1v1: solo hay un eliminado.
  const placement = computeFinalPlacement('p1', ['p2']);
  assert(JSON.stringify(placement) === JSON.stringify(['p1', 'p2']), 'Orden de llegada en un 1v1: [ganador, perdedor]');
}

// --- getTier: los umbrales están ordenados y son consistentes ---
{
  assert(getTier(-100).id === 'bronze', 'Un ordinal muy bajo cae en Bronce');
  assert(getTier(0).id === 'bronze', 'Ordinal 0 (jugador nuevo) cae en Bronce');
  assert(getTier(6).id === 'silver', 'Justo en el umbral de Plata: ya es Plata');
  assert(getTier(5.99).id === 'bronze', 'Justo debajo del umbral de Plata: todavía Bronce');
  assert(getTier(13).id === 'gold', 'Justo en el umbral de Oro: ya es Oro');
  assert(getTier(20).id === 'platinum', 'Justo en el umbral de Platino: ya es Platino');
  assert(getTier(27).id === 'diamond', 'Justo en el umbral de Diamante: ya es Diamante');
  assert(getTier(1000).id === 'diamond', 'Un ordinal absurdamente alto sigue siendo Diamante (no hay tier más arriba)');
}
{
  // Los umbrales tienen que estar en orden creciente, si no getTier se rompe silenciosamente.
  for (let i = 1; i < TIERS.length; i++) {
    assert(TIERS[i].minOrdinal > TIERS[i - 1].minOrdinal, `Los umbrales de tier están en orden creciente (${TIERS[i - 1].name} < ${TIERS[i].name})`);
  }
}

// --- updateSkillRatings: ganar sube, perder baja ---
{
  const skills = [DEFAULT_SKILL, DEFAULT_SKILL, DEFAULT_SKILL, DEFAULT_SKILL]; // 4 jugadores parejos
  const updated = updateSkillRatings(skills); // el orden de entrada YA es el de llegada: [0]=1ro, [3]=último

  assert(skillOrdinal(updated[0]) > skillOrdinal(DEFAULT_SKILL), 'El que salió 1ro sube su ordinal');
  assert(skillOrdinal(updated[3]) < skillOrdinal(DEFAULT_SKILL), 'El que salió último baja su ordinal');
  assert(
    skillOrdinal(updated[0]) > skillOrdinal(updated[1]) &&
      skillOrdinal(updated[1]) > skillOrdinal(updated[2]) &&
      skillOrdinal(updated[2]) > skillOrdinal(updated[3]),
    'El orden de los ordinales resultantes respeta el orden de llegada (1ro > 2do > 3ro > 4to)'
  );
}

// --- Ganarle a rivales con más partidas jugadas (sigma más bajo, más "creíble")
// mueve más el mu que ganarle a alguien totalmente nuevo. ---
{
  const experimentado: { mu: number; sigma: number } = { mu: 30, sigma: 2 }; // ya jugó mucho, el sistema confía en su número
  const nuevo: { mu: number; sigma: number } = { mu: 25, sigma: 8.333 };

  const [meVsExperimentado] = updateSkillRatings([DEFAULT_SKILL, experimentado]);
  const [meVsNuevo] = updateSkillRatings([DEFAULT_SKILL, nuevo]);

  assert(
    meVsExperimentado.mu > meVsNuevo.mu,
    'Ganarle a alguien con rating más confiable (sigma bajo) sube más que ganarle a alguien nuevo con el mismo mu'
  );
}

// --- getNextTier: el siguiente rango hacia arriba, o null en el tope ---
{
  assert(getNextTier('bronze')?.id === 'silver', 'El siguiente después de Bronce es Plata');
  assert(getNextTier('gold')?.id === 'platinum', 'El siguiente después de Oro es Platino');
  assert(getNextTier('diamond') === null, 'No hay siguiente después de Diamante (es el más alto)');
}

console.log('\nTodos los tests del sistema de rating OpenSkill pasaron correctamente.');
