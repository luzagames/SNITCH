// Letras, números y guión bajo, 3 a 20 caracteres — lo suficientemente
// simple para que arme un mail sintético válido (ver auth.ts), y lo
// suficientemente largo/corto para ser un nombre de usuario razonable.
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

// Traduce los códigos de error de Firebase a mensajes que tienen sentido
// para una persona que nunca vio un mail de por medio — un error tipo
// "el mail ya está en uso" sonaría rarísimo acá, ya que la persona nunca
// escribió ningún mail.
export function describeUsernameAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Ese nombre de usuario ya está en uso. Probá con otro, o iniciá sesión si ya es tuyo.';
    case 'auth/weak-password':
      return 'La contraseña es muy corta — necesita al menos 6 caracteres.';
    case 'auth/invalid-email':
      return 'Ese nombre de usuario tiene caracteres que no se pueden usar.';
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'Usuario o contraseña incorrectos.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos — esperá un toque y probá de nuevo.';
    default:
      return (error as Error)?.message ?? 'Ocurrió un error inesperado.';
  }
}
