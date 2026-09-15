import { isValidUsername, describeUsernameAuthError } from '../src/utils/username';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FALLÓ: ' + msg);
  console.log('OK:', msg);
}

// --- isValidUsername ---
assert(isValidUsername('juan_carlos1'), 'Letras, números y guión bajo: válido');
assert(isValidUsername('abc'), 'Exactamente 3 caracteres (el mínimo): válido');
assert(isValidUsername('a'.repeat(20)), 'Exactamente 20 caracteres (el máximo): válido');
assert(!isValidUsername('ab'), 'Menos de 3 caracteres: inválido');
assert(!isValidUsername('a'.repeat(21)), 'Más de 20 caracteres: inválido');
assert(!isValidUsername('juan carlos'), 'Con espacio: inválido');
assert(!isValidUsername('juan@carlos'), 'Con arroba: inválido (justamente lo que evita mails raros)');
assert(!isValidUsername('juan.carlos'), 'Con punto: inválido');
assert(!isValidUsername(''), 'Vacío: inválido');

// --- describeUsernameAuthError ---
assert(
  describeUsernameAuthError({ code: 'auth/email-already-in-use' }).includes('ya está en uso'),
  'Usuario ya existente: mensaje claro sin mencionar mails'
);
assert(
  describeUsernameAuthError({ code: 'auth/weak-password' }).includes('6 caracteres'),
  'Contraseña débil: menciona el mínimo'
);
assert(
  describeUsernameAuthError({ code: 'auth/wrong-password' }).includes('incorrectos'),
  'Contraseña incorrecta: mensaje genérico de usuario/contraseña'
);
assert(
  describeUsernameAuthError({ code: 'auth/user-not-found' }).includes('incorrectos'),
  'Usuario inexistente: mismo mensaje genérico (no delata si el usuario existe o no, por seguridad)'
);
assert(
  !describeUsernameAuthError({ code: 'auth/email-already-in-use' }).toLowerCase().includes('mail') &&
    !describeUsernameAuthError({ code: 'auth/email-already-in-use' }).toLowerCase().includes('email'),
  'Ningún mensaje menciona "mail" — la persona nunca escribió uno'
);

console.log('\nTodos los tests de usuario/contraseña pasaron correctamente.');
