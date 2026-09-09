import { Module } from '@nestjs/common';
import { EdicionModule } from '../edicion/edicion.module.js';
import { EquiposModule } from '../equipos/equipos.module.js';
import { ArchivoService } from './archivo.service.js';
import { PropuestasController } from './propuestas.controller.js';
import { PropuestasRepository } from './propuestas.repository.js';
import { PropuestasService } from './propuestas.service.js';

@Module({
  imports: [EquiposModule, EdicionModule],
  controllers: [PropuestasController],
  providers: [PropuestasService, PropuestasRepository, ArchivoService],
  // El módulo de evaluación las lee y sirve el mismo PDF a los jurados.
  exports: [PropuestasService, PropuestasRepository],
})
export class PropuestasModule {}
