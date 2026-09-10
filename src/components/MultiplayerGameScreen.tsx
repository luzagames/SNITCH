import { useEffect, useState } from 'react';
import { subscribeToGameState, subscribeToOwnHand, submitAction, startHostReferee } from '../firebase/gameSync';
import type { SyncedGameState } from '../firebase/gameSync';
import { Table } from './Table';
import { KillPicker } from './KillPicker';
import { AskPicker } from './AskPicker';
import type { PlayerSeatData } from './PlayerSeat';
import type { AskQuestion, Card } from '../game/types';
import '../styles/theme.css';

type PanelState = 'closed' | 'kill' | 'ask';

export function MultiplayerGameScreen({
  roomCode,
  uid,
  isHost,
}: {
  roomCode: string;
  uid: string;
  isHost: boolean;
}) {
  const [gs, setGs] = useState<SyncedGameState | null>(null);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [panel, setPanel] = useState<PanelState>('closed');

  useEffect(() => {
    const unsubGs = subscribeToGameState(roomCode, setGs);
    const unsubHand = subscribeToOwnHand(roomCode, uid, setMyHand);
    const unsubReferee = isHost ? startHostReferee(roomCode) : undefined;
    return () => {
      unsubGs();
      unsubHand();
      unsubReferee?.();
    };
  }, [roomCode, uid, isHost]);

  if (!gs) {
    return <p style={{ color: 'white', background: 'black', padding: 24 }}>Cargando partida...</p>;
  }

  const myTurn = gs.turnOrder[gs.currentTurnIndex] === uid;
  const waitingOnReferee = gs.pendingAction !== null;
  const actorName = gs.playersPublic[gs.turnOrder[gs.currentTurnIndex]]?.name ?? '';

  if (gs.status === 'finished') {
    const winnerName = gs.winnerId ? gs.playersPublic[gs.winnerId]?.name : '???';
    return (
      <div className="snitch-root" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 28 }}>WINNER</p>
        <p style={{ fontSize: 32, margin: '16px 0' }}>{winnerName}</p>
        <p style={{ fontSize: 20, color: 'var(--snitch-muted)' }}>LAST PLAYER STANDING</p>
      </div>
    );
  }

  const seatData: PlayerSeatData[] = gs.turnOrder.map((playerId) => {
    const pub = gs.playersPublic[playerId];
    const isYou = playerId === uid;
    return {
      id: playerId,
      name: pub.name,
      alive: pub.alive,
      lives: pub.lives,
      isYou,
      isCurrentTurn: playerId === gs.turnOrder[gs.currentTurnIndex],
      cardStates: isYou
        ? myHand.map((card) => ({ kind: 'faceup' as const, card }))
        : Array.from({ length: pub.handCount }, () => ({ kind: 'hidden' as const })),
    };
  });

  function handleKill(card: Card) {
    submitAction(roomCode, { type: 'kill', actorId: uid, card });
    setPanel('closed');
  }

  function handleAsk(question: AskQuestion) {
    submitAction(roomCode, { type: 'ask', actorId: uid, question });
    setPanel('closed');
  }

  return (
    <div className="snitch-root" style={{ padding: 24 }}>
      <Table players={seatData} />

      <p style={{ textAlign: 'center', fontSize: 18, minHeight: 24 }}>{gs.lastMessage}</p>

      {gs.lastAnswers && (
        <p style={{ textAlign: 'center', fontSize: 16, color: 'var(--snitch-muted)' }}>
          {gs.lastAnswers.map((a) => `${gs.playersPublic[a.playerId]?.name}${a.matches ? '✓' : '✗'}`).join('  ')}
        </p>
      )}

      {waitingOnReferee && (
        <p style={{ textAlign: 'center', fontSize: 16, color: 'var(--snitch-muted)' }}>Resolviendo...</p>
      )}

      {!waitingOnReferee && panel === 'closed' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          {myTurn ? (
            <>
              <p style={{ fontSize: 20, alignSelf: 'center', margin: 0 }}>Tu turno:</p>
              <button className="snitch-btn-accent" onClick={() => setPanel('kill')}>
                KILL
              </button>
              <button className="snitch-btn-accent" onClick={() => setPanel('ask')}>
                ASK
              </button>
            </>
          ) : (
            <p style={{ fontSize: 18, color: 'var(--snitch-muted)' }}>Turno de {actorName}...</p>
          )}
        </div>
      )}

      {panel === 'kill' && <KillPicker onPick={handleKill} onCancel={() => setPanel('closed')} />}
      {panel === 'ask' && <AskPicker onSubmit={handleAsk} onCancel={() => setPanel('closed')} />}
    </div>
  );
}
