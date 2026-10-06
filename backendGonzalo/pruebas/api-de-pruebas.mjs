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

const hijo = spawn('node', ['--env-file=.env', 'dist/main.js'], {
  env: { ...process.env, PORT: PUERTO, DATABASE_URL: urlPruebas },
  stdio: 'inherit',
});

process.on('SIGINT', () => hijo.kill('SIGINT'));
hijo.on('exit', (codigo) => process.exit(codigo ?? 0));
