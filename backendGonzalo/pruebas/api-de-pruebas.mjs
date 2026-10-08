/*
 * Levanta la API apuntada al esquema `pruebas`, no al de desarrollo.
 *
 * Existe para no tener que acordarse de la cadena de conexión con el
 * search_path, que es larga y fácil de escribir mal. Ctrl-C la baja.
 *
 *   npm run pruebas:api
 */
import { spawn } from 'node:child_process';

const PUERTO = process.env.PUERTO_PRUEBAS ?? '3999';
const urlPruebas = `${process.env.DATABASE_URL.split('?')[0]}?options=-c%20search_path%3Dpruebas,public`;

console.log(`API de pruebas en http://localhost:${PUERTO} · esquema "pruebas"\n`);

// Las variables puestas acá le ganan al .env (Node no pisa las que ya existen):
//  · Sin clave de Resend, ningún correo sale de verdad: quedan anotados como
//    «omitido» y el recorrido los verifica en la tabla `envios`. Mandarle
//    correos reales a direcciones inventadas de test.local los haría rebotar,
//    y los rebotes le bajan la reputación al dominio.
//  · La clave de prueba de Turnstile aprueba cualquier token.
//  · La tarea periódica apagada: el recorrido la corre a mano, cuando toca.
const hijo = spawn('node', ['--env-file=.env', 'dist/main.js'], {
  env: {
    ...process.env,
    PORT: PUERTO,
    DATABASE_URL: urlPruebas,
    API_URL: `http://localhost:${PUERTO}`,
    RESEND_API_KEY: '',
    TURNSTILE_SECRET: '1x0000000000000000000000000000000AA',
    TAREA_INTERVALO_MINUTOS: '0',
  },
  stdio: 'inherit',
});

process.on('SIGINT', () => hijo.kill('SIGINT'));
hijo.on('exit', (codigo) => process.exit(codigo ?? 0));
