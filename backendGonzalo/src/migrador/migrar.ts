/*
 * Corredor de migraciones.
 *
 * Lee los .sql de `migraciones/` en orden alfabético, corre cada uno dentro de
 * una transacción y anota cuáles ya aplicó. Correrlo dos veces no hace nada.
 *
 *   npm run migrar
 *
 * Sin librería a propósito: con SQL plano, el esquema queda exactamente igual
 * al documentado y no hay una capa que decida cosas por su cuenta.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CARPETA = join(RAIZ, 'migraciones');

async function migrar(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL. Corré con: npm run migrar');
    process.exit(1);
  }

  const cliente = new Client({ connectionString: url });
  await cliente.connect();

  try {
    await cliente.query(`
      create table if not exists migraciones (
        nombre     text primary key,
        sha256     text not null,
        aplicada_en timestamptz not null default now()
      )
    `);

    const archivos = (await readdir(CARPETA)).filter((a) => a.endsWith('.sql')).sort();
    const { rows } = await cliente.query<{ nombre: string; sha256: string }>(
      'select nombre, sha256 from migraciones',
    );
    const aplicadas = new Map(rows.map((f) => [f.nombre, f.sha256]));

    let nuevas = 0;

    for (const archivo of archivos) {
      const sql = await readFile(join(CARPETA, archivo), 'utf8');
      const hash = createHash('sha256').update(sql).digest('hex');
      const yaAplicada = aplicadas.get(archivo);

      if (yaAplicada) {
        // Editar una migración ya aplicada deja la base y el repo diciendo
        // cosas distintas. Mejor cortar que seguir con esa mentira.
        if (yaAplicada !== hash) {
          throw new Error(
            `${archivo} ya se aplicó pero cambió desde entonces.\n` +
              'Revertí el archivo o escribí una migración nueva.',
          );
        }
        console.log(`  ·  ${archivo}`);
        continue;
      }

      await cliente.query('begin');
      try {
        await cliente.query(sql);
        await cliente.query('insert into migraciones (nombre, sha256) values ($1, $2)', [
          archivo,
          hash,
        ]);
        await cliente.query('commit');
        console.log(`  ✓  ${archivo}`);
        nuevas += 1;
      } catch (error) {
        await cliente.query('rollback');
        console.error(`  ✗  ${archivo}`);
        throw error;
      }
    }

    console.log(
      nuevas === 0
        ? '\nLa base ya estaba al día.'
        : `\n${nuevas} migración(es) aplicada(s).`,
    );
  } finally {
    await cliente.end();
  }
}

await migrar();
