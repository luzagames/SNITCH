import { useState } from 'react';
import { useAnonymousAuth } from '../firebase/auth';
import { getRoomHostId } from '../firebase/rooms';
import { HomeScreen } from './HomeScreen';
import { Lobby } from './Lobby';
import { MultiplayerGameScreen } from './MultiplayerGameScreen';
import '../styles/theme.css';

type Screen = 'home' | 'lobby' | 'game';

export function SnitchApp() {
  const { user, error } = useAnonymousAuth();
  const [screen, setScreen] = useState<Screen>('home');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);

  if (error) {
    return <p style={{ color: 'red', padding: 24 }}>Error de conexión: {error}</p>;
  }

  if (!user) {
    return <p style={{ color: 'white', background: 'black', padding: 24 }}>Conectando...</p>;
  }

  async function enterRoom(code: string) {
    const host = await getRoomHostId(code);
    setHostId(host);
    setRoomCode(code);
    setScreen('lobby');
  }

  if (screen === 'home') {
    return <HomeScreen uid={user.uid} onEnterRoom={enterRoom} />;
  }

  if (screen === 'lobby' && roomCode) {
    return <Lobby roomCode={roomCode} uid={user.uid} onGameStarted={() => setScreen('game')} />;
  }

  if (screen === 'game' && roomCode) {
    return <MultiplayerGameScreen roomCode={roomCode} uid={user.uid} isHost={user.uid === hostId} />;
  }

  return null;
}
