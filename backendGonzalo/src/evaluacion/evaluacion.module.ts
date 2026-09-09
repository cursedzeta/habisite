import { Module } from '@nestjs/common';
import { EdicionModule } from '../edicion/edicion.module.js';
import { PropuestasModule } from '../propuestas/propuestas.module.js';
import { EvaluacionController } from './evaluacion.controller.js';
import { EvaluacionRepository } from './evaluacion.repository.js';
import { EvaluacionService } from './evaluacion.service.js';

@Module({
  imports: [PropuestasModule, EdicionModule],
  controllers: [EvaluacionController],
  providers: [EvaluacionService, EvaluacionRepository],
  exports: [EvaluacionRepository],
})
export class EvaluacionModule {}
