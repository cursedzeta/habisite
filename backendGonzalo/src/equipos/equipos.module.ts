import { Module } from '@nestjs/common';
import { EdicionModule } from '../edicion/edicion.module.js';
import { PerfilesModule } from '../perfiles/perfiles.module.js';
import { EquiposController } from './equipos.controller.js';
import { EquiposRepository } from './equipos.repository.js';
import { EquiposService } from './equipos.service.js';

@Module({
  imports: [PerfilesModule, EdicionModule],
  controllers: [EquiposController],
  providers: [EquiposService, EquiposRepository],
  // El login pregunta acá si un token de invitación habilita a entrar.
  exports: [EquiposRepository, EquiposService],
})
export class EquiposModule {}
