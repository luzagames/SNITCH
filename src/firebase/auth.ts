import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth';
import { auth } from './config';

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
