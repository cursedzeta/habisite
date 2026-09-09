import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { SesionGuard } from './auth/sesion.guard.js';
import { RolGuard } from './comun/autorizacion/rol.guard.js';
import { BaseDeDatosModule } from './comun/base-de-datos/base-de-datos.module.js';
import { validarEntorno } from './configuracion/entorno.js';
import { EdicionModule } from './edicion/edicion.module.js';
import { EquiposModule } from './equipos/equipos.module.js';
import { EvaluacionModule } from './evaluacion/evaluacion.module.js';
import { PerfilesModule } from './perfiles/perfiles.module.js';
import { PropuestasModule } from './propuestas/propuestas.module.js';
import { ResultadosModule } from './resultados/resultados.module.js';
import { SaludModule } from './salud/salud.module.js';

@Module({
  imports: [
    // Lee el .env y lo valida. Si algo falta o está mal, el proceso no arranca
    // y dice cuál es la variable — mejor que fallar en el primer login.
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validarEntorno }),
    BaseDeDatosModule,
    SaludModule,
    EdicionModule,
    PerfilesModule,
    AuthModule,
    EquiposModule,
    PropuestasModule,
    EvaluacionModule,
    ResultadosModule,
  ],
  providers: [
    // El ORDEN importa: los guards globales corren en el orden en que se
    // declaran acá. SesionGuard resuelve quién es y lo cuelga en el request;
    // RolGuard necesita ese dato para decidir.
    { provide: APP_GUARD, useClass: SesionGuard },
    { provide: APP_GUARD, useClass: RolGuard },
  ],
})
export class AppModule {}
