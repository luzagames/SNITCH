import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { auth } from './config';

// Mantiene al usuario logueado como anónimo automáticamente. Mientras
// "user" sea null, todavía no sabemos quién es este browser (o Firebase
// está fallando: revisar .env.local y la configuración de Authentication).
export function useAnonymousAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        signInAnonymously(auth).catch((e) => setError(e.message));
      }
    });
    return unsubscribe;
  }, []);

  return { user, error };
}
