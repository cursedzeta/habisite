import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { Entorno } from '../configuracion/entorno.js';
import { EquiposModule } from '../equipos/equipos.module.js';
import { PerfilesModule } from '../perfiles/perfiles.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EnlaceIngresoRepository } from './enlace-ingreso.repository.js';
import { EnlaceIngresoService } from './enlace-ingreso.service.js';
import { LimitadorInscripcion } from '../perfiles/limitador.js';
import { SesionGuard } from './sesion.guard.js';
import { SesionService } from './sesion.service.js';

@Module({
  imports: [
    PerfilesModule,
    EquiposModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Entorno, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: config.get('JWT_EXPIRACION', { infer: true }) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SesionService,
    SesionGuard,
    EnlaceIngresoService,
    EnlaceIngresoRepository,
    LimitadorInscripcion,
  ],
  // SesionGuard sale exportado porque AppModule lo registra como guard global.
  exports: [SesionService, SesionGuard],
})
export class AuthModule {}
