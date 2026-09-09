import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { FiltroDeErrores } from './comun/filtros/errores-http.filtro.js';
import type { Entorno } from './configuracion/entorno.js';
import { documentarApi } from './documentacion.js';

async function arrancar(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<Entorno, true>>(ConfigService);

  // El JSON de la API es chico. El PDF viaja por multipart y tiene su propio tope.
  app.useBodyParser('json', { limit: '1mb' });
  app.use(cookieParser());

  // Un solo origen, con credenciales: '*' no vale cuando viaja la cookie de sesión.
  app.enableCors({
    origin: config.get('FRONTEND_URL', { infer: true }),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta los campos que el DTO no declara
      forbidNonWhitelisted: true, // …y avisa si venían
      transform: true, // "3" → 3 cuando el DTO dice number
    }),
  );
  app.useGlobalFilters(new FiltroDeErrores());
  app.enableShutdownHooks(); // así el Pool cierra prolijo al apagar

  documentarApi(app);

  const puerto = config.get('PORT', { infer: true });
  await app.listen(puerto, '0.0.0.0'); // Railway necesita 0.0.0.0, no localhost
  Logger.log(`API escuchando en http://localhost:${puerto}`, 'Arranque');
  Logger.log(`Documentación en http://localhost:${puerto}/docs`, 'Arranque');
}

await arrancar();
