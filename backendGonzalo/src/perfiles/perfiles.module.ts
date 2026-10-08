import { Module } from '@nestjs/common';
import { EdicionModule } from '../edicion/edicion.module.js';
import { LimitadorInscripcion } from './limitador.js';
import { PerfilesController } from './perfiles.controller.js';
import { PerfilesRepository } from './perfiles.repository.js';
import { PerfilesService } from './perfiles.service.js';
import { TurnstileService } from './turnstile.service.js';

@Module({
  imports: [EdicionModule],
  controllers: [PerfilesController],
  providers: [PerfilesService, PerfilesRepository, TurnstileService, LimitadorInscripcion],
  // El repositorio sale exportado porque SesionGuard lo usa en cada request.
  exports: [PerfilesRepository, PerfilesService],
})
export class PerfilesModule {}
