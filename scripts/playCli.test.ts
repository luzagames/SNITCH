import { main, QueueInputSource } from './playCli';

// Simula: 2 jugadores (Ana, Beto), y una secuencia larga de turnos
// alternando KILL sobre distintas cartas y ASK con distintas preguntas,
// hasta que el juego termine solo (por vidas o por cartas).
// Si el índice de carta elegido no existe en ninguna mano, se registra
// como "miss" y resta una vida al que preguntó/mató, así que con
// suficientes intentos la partida siempre termina.
function buildAnswers(): string[] {
  const answers: string[] = ['2', 'Ana', 'Beto'];
  for (let i = 0; i < 40; i++) {
    if (i % 2 === 0) {
      // KILL sobre una carta distinta cada vez, recorriendo el mazo
      answers.push('k', String(i % 52));
    } else {
      // ASK alternando entre un par de preguntas simples
      if (i % 4 === 1) {
        answers.push('a', '0', '10'); // greater than 10
      } else {
        answers.push('a', '5'); // repeated value in hand (sin params)
      }
    }
  }
  return answers;
}

async function run() {
  const input = new QueueInputSource(buildAnswers());
  await main(input);
}

run().catch((e) => {
  console.error('TEST FALLÓ:', e);
  process.exit(1);
});
