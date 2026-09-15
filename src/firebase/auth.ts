import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from './config';
import { isValidUsername, describeUsernameAuthError } from '../utils/username';

export { isValidUsername, describeUsernameAuthError };

// --- Usuario y contraseña, sin mail real ---
//
// Firebase Auth no tiene un modo "usuario y contraseña" nativo — su
// sistema de contraseñas SIEMPRE es email+contraseña por dentro. El
// truco (estándar, lo usan un montón de apps chicas) es fabricar un mail
// FALSO a partir del nombre de usuario, invisible para la persona: ella
// solo ve "usuario" y "contraseña" en la pantalla, nunca el mail
// sintético. La unicidad de mails que ya garantiza Firebase nos da la
// unicidad de nombres de usuario totalmente gratis, sin tener que
// programar nada aparte para chequearla.
const FAKE_EMAIL_DOMAIN = '@snitch-app.local';

function usernameToFakeEmail(username: string): string {
  // minúsculas siempre, para que "Juan" y "juan" sean la MISMA cuenta —
  // Firebase por sí solo no garantiza esto si dejáramos pasar mayúsculas
  // tal cual en el mail.
  return `${username.toLowerCase()}${FAKE_EMAIL_DOMAIN}`;
}

export async function signUpWithUsername(username: string, password: string): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, usernameToFakeEmail(username), password);
  // Guardamos el nombre elegido como displayName — así ensureProfile (en
  // SnitchApp.tsx) lo toma como sugerencia inicial, exactamente igual que
  // hace con el nombre de Google para esa otra forma de entrar.
  await updateProfile(credential.user, { displayName: username });
}

export async function signInWithUsername(username: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, usernameToFakeEmail(username), password);
}

// Convierte la cuenta anónima ACTUAL en una cuenta de usuario/contraseña
// de verdad, sin perder nada — a diferencia de signUpWithUsername (que
// crea un usuario nuevo desde cero), esto usa linkWithCredential para
// "engancharle" la contraseña a la MISMA cuenta anónima que ya tenías,
// conservando el mismo uid. Si estabas en el medio de una sala o una
// partida, seguís siendo la misma persona para el sistema.
export async function upgradeAnonymousToUsername(username: string, password: string): Promise<void> {
  if (!auth.currentUser) throw new Error('No hay ninguna sesión anónima activa para convertir.');
  const credential = EmailAuthProvider.credential(usernameToFakeEmail(username), password);
  await linkWithCredential(auth.currentUser, credential);
  await updateProfile(auth.currentUser, { displayName: username });
}

// A diferencia de la versión anterior, esto YA NO inicia sesión anónima
// automáticamente. Solo observa si hay alguien logueado (de una sesión
// anterior que Firebase recordó) o no. Si no hay nadie, el que llama
// (la pantalla de elección) decide cuándo invocar signInAnonymouslyUser()
// o signInWithGoogle().
export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false); // ya terminamos de chequear el estado inicial
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (u) => {
        setUser(u);
        setChecked(true);
      },
      (e) => setError(e.message)
    );
    return unsubscribe;
  }, []);

  return { user, checked, error };
}

export async function signInAnonymouslyUser(): Promise<void> {
  await signInAnonymously(auth);
}

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
