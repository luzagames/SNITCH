import { useEffect, useState } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAnonymousAuth } from '../firebase/auth';

// Componente de prueba temporal: NO es parte del juego final. Sirve para
// confirmar, en un solo lugar, que Auth y Firestore están bien configurados
// antes de construir salas/partidas encima. Se borra cuando esto funcione.
export function FirebaseTest() {
  const { user, error } = useAnonymousAuth();
  const [firestoreStatus, setFirestoreStatus] = useState<string>('Probando Firestore...');

  useEffect(() => {
    if (!user) return;

    async function testFirestore() {
      try {
        const ref = doc(db, '_connection_test', user!.uid);
        await setDoc(ref, { pingAt: Date.now() });
        const snap = await getDoc(ref);
        setFirestoreStatus(snap.exists() ? 'Firestore OK: escritura y lectura funcionan.' : 'Firestore raro: escribió pero no lee.');
      } catch (e) {
        setFirestoreStatus(`Firestore FALLÓ: ${(e as Error).message}`);
      }
    }

    testFirestore();
  }, [user]);

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', color: 'white', background: 'black' }}>
      <h2>Chequeo de conexión Firebase</h2>
      {error && <p style={{ color: 'red' }}>Error de Auth: {error}</p>}
      {!user && !error && <p>Conectando...</p>}
      {user && <p>Auth OK. Tu ID anónimo: {user.uid}</p>}
      <p>{firestoreStatus}</p>
    </div>
  );
}
