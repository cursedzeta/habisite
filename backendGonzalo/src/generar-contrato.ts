/*
 * Escribe `contrato/openapi.yaml` en la raíz del repo.
 *
 *   npm run contrato
 *
 * Es la frontera entre el back y el front: de acá Tomás genera sus tipos y
 * puede programar pantallas contra datos de prueba sin esperar que la API
 * funcione. Levanta la app sin escuchar en ningún puerto y sin tocar la base.
 */
import { NestFactory } from '@nestjs/core';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { AppModule } from './app.module.js';
import { construirDocumento } from './documentacion.js';

// Relativo al cwd y no al archivo: npm siempre corre desde la raíz del
// paquete, así que da igual si esto se ejecuta desde src/ o desde dist/.
const DESTINO = join(process.cwd(), '..', 'contrato');

async function generar(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();

  const documento = construirDocumento(app);
  await mkdir(DESTINO, { recursive: true });
  await writeFile(join(DESTINO, 'openapi.yaml'), stringify(documento), 'utf8');

  const rutas = Object.values(documento.paths ?? {}).reduce(
    (total, ruta) => total + Object.keys(ruta ?? {}).length,
    0,
  );
  console.log(`contrato/openapi.yaml escrito · ${rutas} operaciones`);

  await app.close();
}

await generar();
