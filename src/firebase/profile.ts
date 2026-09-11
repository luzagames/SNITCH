import { doc, getDoc, setDoc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { db } from './config';
import type { MatchStatsAccumulator } from './gameSyncLogic';
import type { AchievementId } from '../game/achievements';

export interface UserProfile {
  username: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  killAttempts: number;
  killHits: number;
  jokersCaught: number;
  selfBluffs: number;
  successfulBluffs: number;
  askCount: number;
  passCount: number;
  achievements: AchievementId[];
}

const DEFAULT_PROFILE: Omit<UserProfile, 'username'> = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  currentStreak: 0,
  bestStreak: 0,
  killAttempts: 0,
  killHits: 0,
  jokersCaught: 0,
  selfBluffs: 0,
  successfulBluffs: 0,
  askCount: 0,
  passCount: 0,
  achievements: [],
};

function profileRef(uid: string) {
  return doc(db, 'users', uid);
}

// Se llama la primera vez que alguien inicia sesión con Google. Si ya
// tiene perfil, no lo pisa (para no resetear sus stats). Si no tiene, lo
// crea con los valores por defecto y devuelve isNew=true, para que quien
// llama sepa que tiene que mostrarle la pantalla de "elegí tu nombre".
export async function ensureProfile(
  uid: string,
  suggestedUsername: string
): Promise<{ profile: UserProfile; isNew: boolean }> {
  const ref = profileRef(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { profile: snap.data() as UserProfile, isNew: false };
  }
  const profile: UserProfile = { username: suggestedUsername, ...DEFAULT_PROFILE };
  await setDoc(ref, profile);
  return { profile, isNew: true };
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(profileRef(uid));
  if (!snap.exists()) return null;
  const raw = snap.data() as Partial<UserProfile>;
  // Rellena cualquier campo faltante (perfiles viejos) o corrupto (NaN de
  // una versión anterior con el bug) con su valor por defecto, sin
  // necesidad de esperar a la próxima partida para que se vea bien.
  return {
    username: raw.username ?? 'Jugador',
    gamesPlayed: numOr0(raw.gamesPlayed),
    wins: numOr0(raw.wins),
    losses: numOr0(raw.losses),
    currentStreak: numOr0(raw.currentStreak),
    bestStreak: numOr0(raw.bestStreak),
    killAttempts: numOr0(raw.killAttempts),
    killHits: numOr0(raw.killHits),
    jokersCaught: numOr0(raw.jokersCaught),
    selfBluffs: numOr0(raw.selfBluffs),
    successfulBluffs: numOr0(raw.successfulBluffs),
    askCount: numOr0(raw.askCount),
    passCount: numOr0(raw.passCount),
    achievements: raw.achievements ?? [],
  };
}

export async function updateUsername(uid: string, username: string): Promise<void> {
  await updateDoc(profileRef(uid), { username });
}

// Devuelve el número tal cual si es válido, o 0 si es undefined (perfiles
// viejos, de antes de que existiera este campo) o NaN (perfiles que ya
// quedaron "contaminados" por el bug de undefined + número = NaN). Así,
// cualquier perfil corrupto se autorepara solo la próxima vez que se
// escribe, sin necesidad de migrar nada a mano.
function numOr0(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

// Logros que dependen de números ACUMULADOS de por vida (no de una
// partida puntual). Se evalúan contra el perfil YA actualizado con la
// partida que se acaba de jugar.
function computeLifetimeAchievements(updated: UserProfile): AchievementId[] {
  const unlocked: AchievementId[] = [];
  if (updated.currentStreak >= 3) unlocked.push('snitcher_pro');
  if (updated.wins >= 30) unlocked.push('gordo_vicio');
  if (updated.successfulBluffs >= 25) unlocked.push('versero');
  if (updated.jokersCaught >= 15) unlocked.push('payas_off');
  return unlocked;
}

// Registra el resultado + todas las estadísticas + los logros de una
// partida terminada. Solo se llama para jugadores NO anónimos. Usa una
// transacción porque tanto la racha de victorias como los logros de por
// vida necesitan leer el valor anterior antes de decidir el nuevo estado.
export async function recordMatchStats(
  uid: string,
  won: boolean,
  stats: MatchStatsAccumulator,
  matchAchievements: AchievementId[]
): Promise<AchievementId[]> {
  const ref = profileRef(uid);
  let newlyUnlocked: AchievementId[] = [];

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const rawPrev = snap.exists() ? (snap.data() as Partial<UserProfile>) : {};
    const prev: UserProfile = { username: 'Jugador', ...DEFAULT_PROFILE, ...rawPrev };

    const newCurrentStreak = won ? numOr0(prev.currentStreak) + 1 : 0;
    const newBestStreak = Math.max(numOr0(prev.bestStreak), newCurrentStreak);

    const updated: UserProfile = {
      ...prev,
      gamesPlayed: numOr0(prev.gamesPlayed) + 1,
      wins: numOr0(prev.wins) + (won ? 1 : 0),
      losses: numOr0(prev.losses) + (won ? 0 : 1),
      currentStreak: newCurrentStreak,
      bestStreak: newBestStreak,
      killAttempts: numOr0(prev.killAttempts) + stats.killAttempts,
      killHits: numOr0(prev.killHits) + stats.killHits,
      jokersCaught: numOr0(prev.jokersCaught) + stats.jokersCaught,
      selfBluffs: numOr0(prev.selfBluffs) + stats.selfBluffs,
      successfulBluffs: numOr0(prev.successfulBluffs) + stats.successfulBluffs,
      askCount: numOr0(prev.askCount) + stats.askCount,
      passCount: numOr0(prev.passCount) + stats.passCount,
      achievements: prev.achievements ?? [],
    };

    const lifetimeUnlocked = computeLifetimeAchievements(updated);
    const allCandidates = [...matchAchievements, ...lifetimeUnlocked];
    const already = new Set(updated.achievements);
    newlyUnlocked = allCandidates.filter((id) => !already.has(id));

    const merged = new Set(updated.achievements);
    for (const id of allCandidates) merged.add(id);
    updated.achievements = [...merged];

    tx.set(ref, updated);
  });

  return newlyUnlocked;
}

// Se mantiene por si algo todavía la usa en algún lado, pero
// recordMatchStats es la función real a partir de ahora.
export async function recordGameResult(uid: string, won: boolean): Promise<void> {
  await setDoc(
    profileRef(uid),
    {
      gamesPlayed: increment(1),
      wins: increment(won ? 1 : 0),
      losses: increment(won ? 0 : 1),
    },
    { merge: true }
  );
}
