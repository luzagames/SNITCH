import { useState } from 'react';
import { createGame, currentPlayer, resolveAsk, resolveKill } from '../game/rules';
import { cardLabel } from '../game/display';
import { Table } from './Table';
import { KillPicker } from './KillPicker';
import { AskPicker } from './AskPicker';
import type { PlayerSeatData } from './PlayerSeat';
import type { AskQuestion, Card, GameState } from '../game/types';
import '../styles/theme.css';

type PanelState = 'closed' | 'kill' | 'ask';

const DEMO_NAMES = ['Lolo', 'Juan', 'Martin', 'Pedro', 'Sofia', 'Vale'];

export function GameScreen({ playerCount = 4 }: { playerCount?: number }) {
  const [game, setGame] = useState<GameState>(() => {
    const players = DEMO_NAMES.slice(0, playerCount).map((name, i) => ({ id: `p${i + 1}`, name }));
    return createGame(players);
  });
  const [panel, setPanel] = useState<PanelState>('closed');
  const [lastMessage, setLastMessage] = useState<string>('¡Arrancó la partida!');

  const actor = currentPlayer(game);

  function refresh(message: string) {
    setGame({ ...game });
    setLastMessage(message);
    setPanel('closed');
  }

  function handleKill(card: Card) {
    const result = resolveKill(game, actor.id, card);
    if (result.hit) {
      refresh(`¡Impacto! ${result.hitPlayerId} tenía ${cardLabel(card)}.`);
    } else {
      // Mismo texto tanto para un fallo real como para un bluff sobre la
      // propia carta (result.selfBluff) — si lo distinguiéramos acá,
      // estaríamos revelando qué carta tiene el actor.
      refresh(`Nadie tenía ${cardLabel(card)}. ${actor.name} perdió 1 corazón.`);
    }
  }

  function handleAsk(question: AskQuestion) {
    const result = resolveAsk(game, actor.id, question);
    const ticks = result.answers.map((a) => `${a.playerId}${a.matches ? '✓' : '✗'}`).join(' ');
    refresh(
      result.anyMatch
        ? `${actor.name} preguntó y hubo respuestas: ${ticks}`
        : `${actor.name} preguntó y nadie respondió ✓. Perdió 1 corazón. (${ticks})`
    );
  }

  const seatData: PlayerSeatData[] = game.players.map((p) => ({
    id: p.id,
    name: p.name,
    alive: p.alive,
    lives: p.lives,
    isYou: p.id === actor.id,
    isCurrentTurn: p.id === actor.id,
    cardStates:
      p.id === actor.id
        ? p.hand.map((card) => ({ kind: 'faceup' as const, card }))
        : p.hand.map(() => ({ kind: 'hidden' as const })),
  }));

  if (game.status === 'finished') {
    const winner = game.players.find((p) => p.id === game.winnerId);
    return (
      <div className="snitch-root" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 28 }}>WINNER</p>
        <p style={{ fontSize: 32, margin: '16px 0' }}>{winner?.name}</p>
        <p style={{ fontSize: 20, color: 'var(--snitch-muted)' }}>LAST PLAYER STANDING</p>
      </div>
    );
  }

  return (
    <div className="snitch-root" style={{ padding: 24 }}>
      <Table players={seatData} />

      <p style={{ textAlign: 'center', fontSize: 18, minHeight: 24 }}>{lastMessage}</p>

      {panel === 'closed' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          <p style={{ fontSize: 20, alignSelf: 'center', margin: 0 }}>Turno de {actor.name}:</p>
          <button className="snitch-btn-accent" onClick={() => setPanel('kill')}>
            KILL
          </button>
          <button className="snitch-btn-accent" onClick={() => setPanel('ask')}>
            ASK
          </button>
        </div>
      )}

      {panel === 'kill' && <KillPicker onPick={handleKill} onCancel={() => setPanel('closed')} />}
      {panel === 'ask' && <AskPicker onSubmit={handleAsk} onCancel={() => setPanel('closed')} />}
    </div>
  );
}
