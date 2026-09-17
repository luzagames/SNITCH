import { useEffect, useState } from 'react';
import { useAuthState } from '../firebase/auth';
import { ensureProfile } from '../firebase/profile';
import type { UserProfile } from '../firebase/profile';
import { checkRoomMembership } from '../firebase/rooms';
import { saveActiveRoom, getSavedActiveRoom, clearActiveRoom } from '../utils/roomPersistence';
import { HomeScreen } from './HomeScreen';
import { LoginChoiceScreen } from './LoginChoiceScreen';
import { ChooseUsernameScreen } from './ChooseUsernameScreen';
import { ProfileScreen } from './ProfileScreen';
import { RulesScreen } from './RulesScreen';
import { RankingScreen } from './RankingScreen';
import { Lobby } from './Lobby';
import { MultiplayerGameScreen } from './MultiplayerGameScreen';
import { LoadingScreen } from './LoadingScreen';
import { applyStoredSkinOnBoot, useSkin } from '../hooks/useSkin';
import { getSkinById, DEFAULT_SKIN_ID } from '../game/skins';
import '../styles/theme.css';

// Se llama una sola vez, al cargar este módulo — antes de que React monte
// nada — para que el skin guardado ya esté puesto cuando se pinta la
// primera pantalla, sin un "flash" del skin por defecto.
applyStoredSkinOnBoot();

type Screen = 'home' | 'profile' | 'rules' | 'ranking' | 'lobby' | 'game';

interface NavState {
  screen: Screen;
  roomCode: string | null;
}

export function SnitchApp() {
  const { user, checked, error } = useAuthState();
  const [screen, setScreen] = useState<Screen>('home');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [reconnectChecked, setReconnectChecked] = useState(false);
  const { skinId, setSkinId } = useSkin();

  // Va a una pantalla nueva, agregando una entrada al historial del
  // navegador — así el botón de atrás (física o del navegador) tiene
  // algo real a donde volver, en vez de sacarte de la página entera.
  function navigate(next: Screen, nextRoomCode: string | null = roomCode) {
    setScreen(next);
    setRoomCode(nextRoomCode);
    window.history.pushState({ screen: next, roomCode: nextRoomCode } satisfies NavState, '');
  }

  // Para "volver" (botones de "‹ Volver" adentro de la app) — en vez de
  // ir a mano a la pantalla anterior, le pedimos al navegador que retroceda
  // de verdad en su propio historial. Así el botón de atrás del navegador
  // y el botón de "Volver" de la app hacen EXACTAMENTE lo mismo, y nunca
  // se desincronizan entre sí.
  function goBack() {
    window.history.back();
  }

  // Deja plantada una entrada base de "estamos en Home" apenas arranca la
  // app, para que la PRIMERA vez que alguien toque atrás ya tenga algo
  // consistente con qué comparar (si no, event.state llega null).
  useEffect(() => {
    window.history.replaceState({ screen: 'home', roomCode: null } satisfies NavState, '');
  }, []);

  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const state = event.state as NavState | null;
      if (state) {
        setScreen(state.screen);
        setRoomCode(state.roomCode);
      } else {
        // Retrocedimos más allá de la primera entrada que plantamos — no
        // debería pasar normalmente, pero por las dudas volvemos al inicio
        // en vez de dejar la pantalla en un estado sin sentido.
        setScreen('home');
      }
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

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

  // Si el skin que tenías guardado en este navegador ya no te corresponde
  // (por ejemplo, bajamos el umbral de otro skin, o directamente cambió
  // qué skin es cuál) te volvemos a Noir Clásico automáticamente — no
  // hace falta que abras el selector para que se note. Los anónimos nunca
  // tienen KILLs exitosos guardados (no tienen perfil), así que para
  // ellos cualquier skin que no sea el gratuito directamente no corresponde.
  useEffect(() => {
    if (!user) return;
    const killHits = user.isAnonymous ? 0 : (profile?.killHits ?? null);
    if (killHits === null) return; // perfil todavía no cargó, no decidir a ciegas
    const current = getSkinById(skinId);
    if (killHits < current.killHitsRequired) {
      setSkinId(DEFAULT_SKIN_ID);
    }
  }, [user, profile, skinId, setSkinId]);

  // Si al abrir la app hay una sala guardada de una sesión anterior (F5,
  // cierre de pestaña sin querer, etc.), confirmamos que todavía seas
  // miembro real antes de mandarte de vuelta — si el sistema de latido ya
  // te sacó por desconexión, no reconectamos, vas al inicio como siempre.
  useEffect(() => {
    if (!user) {
      setReconnectChecked(true);
      return;
    }
    const saved = getSavedActiveRoom(user.uid);
    if (!saved) {
      setReconnectChecked(true);
      return;
    }
    checkRoomMembership(saved, user.uid)
      .then(({ valid, status }) => {
        if (valid) {
          const nextScreen: Screen = status === 'playing' ? 'game' : 'lobby';
          setRoomCode(saved);
          setScreen(nextScreen);
          // replaceState, no pushState — esto es determinar dónde arranca
          // la app al cargar (por una reconexión), no una navegación que
          // hizo la persona, así que no debería sumar una entrada al
          // historial.
          window.history.replaceState({ screen: nextScreen, roomCode: saved } satisfies NavState, '');
        } else {
          clearActiveRoom();
        }
      })
      .catch(() => {
        // Si falla la consulta (sin conexión, etc.), no reconectamos a
        // ciegas — mejor mandar al inicio que a un estado incierto.
      })
      .finally(() => setReconnectChecked(true));
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

  if (!reconnectChecked) {
    return <LoadingScreen message="Reconectando..." />;
  }

  const uid = user.uid;

  function enterRoom(code: string) {
    saveActiveRoom(code, uid);
    navigate('lobby', code);
  }

  if (screen === 'home') {
    return (
      <HomeScreen
        uid={user.uid}
        defaultName={user.isAnonymous ? '' : (profile?.username ?? '')}
        isAnonymous={user.isAnonymous}
        onEnterRoom={enterRoom}
        onOpenProfile={() => navigate('profile')}
        onOpenRules={() => navigate('rules')}
        onOpenRanking={() => navigate('ranking')}
      />
    );
  }

  if (screen === 'rules') {
    return <RulesScreen onBack={goBack} />;
  }

  if (screen === 'ranking') {
    return <RankingScreen uid={uid} onBack={goBack} />;
  }

  if (screen === 'profile') {
    return (
      <ProfileScreen
        uid={user.uid}
        onBack={goBack}
        onUsernameChanged={(username) => setProfile((prev) => (prev ? { ...prev, username } : prev))}
      />
    );
  }

  if (screen === 'lobby' && roomCode) {
    return (
      <Lobby
        roomCode={roomCode}
        uid={user.uid}
        onGameStarted={() => navigate('game')}
        onExit={() => {
          clearActiveRoom();
          navigate('home', null);
        }}
      />
    );
  }

  if (screen === 'game' && roomCode) {
    return (
      <MultiplayerGameScreen
        roomCode={roomCode}
        uid={user.uid}
        isAnonymous={user.isAnonymous}
        onExit={() => {
          clearActiveRoom();
          navigate('home', null);
        }}
        onReturnToLobby={goBack}
      />
    );
  }

  return null;
}
