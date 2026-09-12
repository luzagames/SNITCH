import { createGame, resolveAsk } from '../src/game/rules';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FALLÓ: ' + msg);
  console.log('OK:', msg);
}

// createGame elige el turno inicial al azar entre los jugadores — armamos
// un helper para no asumir que 'p1' siempre arranca.
function askerAndVictimIndex(state: ReturnType<typeof createGame>) {
  const askerIndex = state.currentTurnIndex;
  const victimIndex = askerIndex === 0 ? 1 : 0;
  return { askerId: state.players[askerIndex].id, victimIndex };
}

// --- BETWEEN_OF_SUIT: acierta solo si el palo Y el rango coinciden juntos ---
{
  const state = createGame([
    { id: 'p1', name: 'Lolo' },
    { id: 'p2', name: 'Juan' },
  ]);
  const { askerId, victimIndex } = askerAndVictimIndex(state);
  state.players[victimIndex].hand = [{ kind: 'standard', suit: 'spades', rank: 5 }];

  const result = resolveAsk(state, askerId, { id: 'BETWEEN_OF_SUIT', min: 3, max: 7, suit: 'spades' });
  assert(result.answers[0].matches === true, 'BETWEEN_OF_SUIT: tiene un 5 de espadas (dentro del rango) → ✓');
}
{
  const state = createGame([
    { id: 'p1', name: 'Lolo' },
    { id: 'p2', name: 'Juan' },
  ]);
  const { askerId, victimIndex } = askerAndVictimIndex(state);
  state.players[victimIndex].hand = [{ kind: 'standard', suit: 'hearts', rank: 5 }];

  const result = resolveAsk(state, askerId, { id: 'BETWEEN_OF_SUIT', min: 10, max: 13, suit: 'hearts' });
  assert(result.answers[0].matches === false, 'BETWEEN_OF_SUIT: palo correcto pero rango incorrecto → ✗');
}
{
  const state = createGame([
    { id: 'p1', name: 'Lolo' },
    { id: 'p2', name: 'Juan' },
  ]);
  const { askerId, victimIndex } = askerAndVictimIndex(state);
  state.players[victimIndex].hand = [{ kind: 'standard', suit: 'clubs', rank: 5 }];

  const result = resolveAsk(state, askerId, { id: 'BETWEEN_OF_SUIT', min: 3, max: 7, suit: 'hearts' });
  assert(result.answers[0].matches === false, 'BETWEEN_OF_SUIT: rango correcto pero palo incorrecto → ✗');
}

// --- REPEATED_VALUE_IN_HAND: "tiene o tuvo" usando el dato del reparto ---
{
  const state = createGame([
    { id: 'p1', name: 'Lolo' },
    { id: 'p2', name: 'Juan' },
  ]);
  const { askerId, victimIndex } = askerAndVictimIndex(state);
  // La víctima REPARTIÓ con un valor repetido (dos 7), pero en la mano
  // ACTUAL ya solo le queda uno (le mataron el otro durante la partida).
  state.players[victimIndex].hand = [{ kind: 'standard', suit: 'hearts', rank: 7 }];

  const resultSinDato = resolveAsk(state, askerId, { id: 'REPEATED_VALUE_IN_HAND' });
  assert(
    resultSinDato.answers[0].matches === false,
    'REPEATED_VALUE_IN_HAND sin dato de reparto: mira la mano actual (ya no tiene repetida) → ✗'
  );

  const state2 = createGame([
    { id: 'p1', name: 'Lolo' },
    { id: 'p2', name: 'Juan' },
  ]);
  const { askerId: askerId2, victimIndex: victimIndex2 } = askerAndVictimIndex(state2);
  const victimId2 = state2.players[victimIndex2].id;
  state2.players[victimIndex2].hand = [{ kind: 'standard', suit: 'hearts', rank: 7 }];
  const result = resolveAsk(state2, askerId2, { id: 'REPEATED_VALUE_IN_HAND' }, { [victimId2]: true });
  assert(
    result.answers[0].matches === true,
    'REPEATED_VALUE_IN_HAND CON dato de reparto (tuvo repetida): sigue siendo ✓ aunque ya no la tenga'
  );
}

console.log('\nTodos los tests de preguntas de ASK pasaron correctamente.');
