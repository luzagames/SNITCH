import { useEffect, useState } from 'react';
import { useAuthState } from '../firebase/auth';
import { getRoomHostId } from '../firebase/rooms';
import { ensureProfile } from '../firebase/profile';
import type { UserProfile } from '../firebase/profile';
import { HomeScreen } from './HomeScreen';
import { LoginChoiceScreen } from './LoginChoiceScreen';
import { ChooseUsernameScreen } from './ChooseUsernameScreen';
import { ProfileScreen } from './ProfileScreen';
import { RulesScreen } from './RulesScreen';
import { Lobby } from './Lobby';
import { MultiplayerGameScreen } from './MultiplayerGameScreen';
import { LoadingScreen } from './LoadingScreen';
import '../styles/theme.css';

type Screen = 'home' | 'profile' | 'rules' | 'lobby' | 'game';

export function SnitchApp() {
  const { user, checked, error } = useAuthState();
  const [screen, setScreen] = useState<Screen>('home');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!user || user.isAnonymous) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    ensureProfile(user.uid, user.displayName ?? 'Jugador')
      .then(({ profile, isNew }) => {
        setProfile(profile);
        if (isNew) setNeedsUsername(true);
      })
      .finally(() => setProfileLoading(false));
  }, [user]);

  if (error) {
    return <LoadingScreen message={`Error de conexión: ${error}`} isError />;
  }

  if (!checked) {
    return <LoadingScreen message="Conectando..." />;
  }

  // Todavía no eligió cómo entrar (ni Google ni anónimo).
  if (!user) {
    return <LoginChoiceScreen />;
  }

  // Recién se logueó con Google por primera vez: esperamos a que
  // ensureProfile termine, y le pedimos que elija su nombre de usuario.
  if (!user.isAnonymous && profileLoading) {
    return <LoadingScreen message="Preparando tu perfil..." />;
  }

  if (needsUsername && profile) {
    return (
      <ChooseUsernameScreen
        uid={user.uid}
        suggested={profile.username}
        onDone={(username) => {
          setProfile((prev) => (prev ? { ...prev, username } : prev));
          setNeedsUsername(false);
        }}
      />
    );
  }

  async function enterRoom(code: string) {
    const host = await getRoomHostId(code);
    setHostId(host);
    setRoomCode(code);
    setScreen('lobby');
  }

  if (screen === 'home') {
    return (
      <HomeScreen
        uid={user.uid}
        defaultName={user.isAnonymous ? '' : (profile?.username ?? '')}
        isAnonymous={user.isAnonymous}
        onEnterRoom={enterRoom}
        onOpenProfile={() => setScreen('profile')}
        onOpenRules={() => setScreen('rules')}
      />
    );
  }

  if (screen === 'rules') {
    return <RulesScreen onBack={() => setScreen('home')} />;
  }

  if (screen === 'profile') {
    return (
      <ProfileScreen
        uid={user.uid}
        onBack={() => setScreen('home')}
        onUsernameChanged={(username) => setProfile((prev) => (prev ? { ...prev, username } : prev))}
      />
    );
  }

  if (screen === 'lobby' && roomCode) {
    return <Lobby roomCode={roomCode} uid={user.uid} onGameStarted={() => setScreen('game')} />;
  }

  if (screen === 'game' && roomCode) {
    return (
      <MultiplayerGameScreen
        roomCode={roomCode}
        uid={user.uid}
        isHost={user.uid === hostId}
        isAnonymous={user.isAnonymous}
        onExit={() => {
          setRoomCode(null);
          setHostId(null);
          setScreen('home');
        }}
      />
    );
  }

  return null;
}
