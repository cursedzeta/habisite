/*
 * Lo que comparten los scripts de pruebas: cómo pegarle a la API de pruebas,
 * cómo leer la base del esquema `pruebas` y cómo contar las comprobaciones.
 *
 * Cada script corre en su propio proceso, así que el contador de este módulo
 * es el de ese script.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

export const API = process.env.URL_RECORRIDO ?? 'http://localhost:3999';

/** La URL del front que usa la API de pruebas: la del .env, que no se pisa. */
export const FRONT = (process.env.FRONTEND_URL ?? '').replace(/\/$/, '');

// Acceso directo a la base de pruebas, solo para LEER lo que la API no expone
// (los correos anotados, los tokens que viajan por correo) y para adelantar
// el reloj. Nunca para saltear una regla de la API.
export async function conectarBase() {
  const db = new pg.Client({
    connectionString: `${process.env.DATABASE_URL.split('?')[0]}?options=-c%20search_path%3Dpruebas,public`,
  });
  await db.connect();
  const sql = async (texto, valores = []) => (await db.query(texto, valores)).rows;
  return { db, sql };
}

let sesiones = null;
/** Las cookies que firmó `preparar`. Se leen recién cuando hacen falta. */
export function sesionDe(quien) {
  sesiones ??= JSON.parse(readFileSync(process.env.SESIONES_JSON ?? '.tmp-sesiones.json', 'utf8'));
  return sesiones[quien].cookie;
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
export const recorte = (x, n = 160) => String(JSON.stringify(x) ?? '').slice(0, n);
export const fase = (n) => console.log(`\n-- ${n} ${'-'.repeat(Math.max(0, 58 - n.length))}`);

let ok = 0;
let fallos = 0;
const rotos = [];

export function comprobar(etiqueta, condicion, detalle = '') {
  if (condicion) {
    ok++;
    console.log(`  ok    ${etiqueta}`);
  } else {
    fallos++;
    rotos.push(etiqueta);
    console.log(`  FALLA ${etiqueta}  ${detalle}`);
  }
}

/**
 * Le pega a la API. `como` usa una sesión de `preparar`; `cookie` manda una
 * cookie cualquiera (por ejemplo, la que devolvió un canje).
 */
export async function pedir(metodo, ruta, opciones = {}) {
  const { como, cookie, cuerpo, cuerpoCrudo, formData, cabeceras = {} } = opciones;
  const h = { ...cabeceras };
  if (como) h.Cookie = sesionDe(como);
  if (cookie) h.Cookie = cookie;
  let body;
  if (formData) {
    body = formData;
  } else if (cuerpoCrudo !== undefined) {
    h['Content-Type'] = 'application/json';
    body = cuerpoCrudo;
  } else if (cuerpo !== undefined) {
    h['Content-Type'] = 'application/json';
    body = JSON.stringify(cuerpo);
  }
  const r = await fetch(`${API}${ruta}`, { method: metodo, headers: h, body, redirect: 'manual' });
  const tipo = r.headers.get('content-type') ?? '';
  let datos = null;
  if (tipo.includes('json')) datos = await r.json().catch(() => null);
  else if (tipo.includes('pdf')) datos = Buffer.from(await r.arrayBuffer());
  else datos = await r.text().catch(() => null);
  return { estado: r.status, datos, cabeceras: r.headers };
}

/** Imprime el resumen, cierra la base y sale con 1 si algo falló. */
export async function terminar(db) {
  await db.end();
  console.log(`\n${'='.repeat(62)}`);
  console.log(`  ${ok} comprobaciones OK · ${fallos} fallidas`);
  if (rotos.length) {
    console.log('\n  Fallan:');
    rotos.forEach((r) => console.log(`   · ${r}`));
  }
  console.log('='.repeat(62));
  process.exit(fallos ? 1 : 0);
}
