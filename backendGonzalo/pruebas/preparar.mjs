/*
 * Deja la base lista para el recorrido, desde cero y sin tocar desarrollo.
 *
 * Todo vive en el esquema `pruebas` de la misma base: no hace falta el
 * superusuario de Postgres para crearlo, y borrarlo se lleva puesto solo
 * lo de las pruebas. `public` —donde está la base de desarrollo— no se toca.
 *
 * El search_path incluye `public` porque las extensiones (citext, pgcrypto)
 * viven ahí. Las tablas igual se crean en `pruebas`, que va primero.
 *
 *   node --env-file=.env pruebas/preparar.mjs
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const ESQUEMA = 'pruebas';
// A mano y no con `new URL`: para Node, `postgresql:` no es un protocolo
// especial, así que `origin` devuelve "null" y la cadena sale rota.
const urlPruebas = `${process.env.DATABASE_URL.split('?')[0]}?options=-c%20search_path%3D${ESQUEMA},public`;

// ── 1 · Esquema limpio ────────────────────────────────────────────
const admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
await admin.connect();
await admin.query(`drop schema if exists ${ESQUEMA} cascade`);
await admin.query(`create schema ${ESQUEMA}`);
await admin.end();
console.log(`esquema "${ESQUEMA}" recreado`);

// ── 2 · Migraciones ───────────────────────────────────────────────
execFileSync('node', ['--env-file=.env', 'src/migrador/migrar.ts'], {
  env: { ...process.env, DATABASE_URL: urlPruebas },
  stdio: 'inherit',
});

// ── 3 · Gente de prueba, una por rol ──────────────────────────────
// Se insertan directo en la base y se les firma la cookie de sesión con el
// mismo JWT_SECRET que usa la API. Es el único atajo del recorrido: saltea
// el consentimiento de Google, que es de Google y no nuestro. Todo lo demás
// —los guards, el rol leído de la base— corre igual que en producción.
const gente = [
  ['ana@test.local', 'Ana', 'Duarte', 'participante'],
  ['bruno@test.local', 'Bruno', 'Paz', 'participante'],
  ['carla@test.local', 'Carla', 'Ruiz', 'participante'],
  ['j1@test.local', 'Jurado', 'Uno', 'jurado'],
  ['j2@test.local', 'Jurado', 'Dos', 'jurado'],
  ['j3@test.local', 'Jurado', 'Tres', 'jurado'],
  ['admin@test.local', 'Admin', 'Test', 'admin'],
];

const c = new pg.Client({ connectionString: urlPruebas });
await c.connect();
const sesiones = {};
for (const [correo, nombre, apellido, rol] of gente) {
  const r = await c.query(
    `insert into perfiles (correo, nombre, apellido, rol, estado, institucion, pais)
     values ($1, $2, $3, $4, 'habilitado', 'FADU-UBA', 'AR')
     on conflict (correo) do update set rol = excluded.rol
     returning id, sesion_v`,
    [correo, nombre, apellido, rol],
  );
  const { id, sesion_v } = r.rows[0];
  const token = jwt.sign({ sub: id, v: sesion_v }, process.env.JWT_SECRET, { expiresIn: '7d' });
  sesiones[correo.split('@')[0]] = { id, correo, rol, cookie: `sesion=${token}` };
}
await c.end();

writeFileSync('.tmp-sesiones.json', JSON.stringify(sesiones, null, 2));
console.log(`\n${gente.length} perfiles sembrados · sesiones en .tmp-sesiones.json`);
console.log('\nLevantá la API contra el esquema de pruebas:');
console.log(`  PORT=3999 DATABASE_URL="${urlPruebas}" node --env-file=.env dist/main.js`);
