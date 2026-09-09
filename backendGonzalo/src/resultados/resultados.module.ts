import { Module } from '@nestjs/common';
import { EdicionModule } from '../edicion/edicion.module.js';
import { EquiposModule } from '../equipos/equipos.module.js';
import { ResultadosController } from './resultados.controller.js';
import { ResultadosRepository } from './resultados.repository.js';
import { ResultadosService } from './resultados.service.js';

@Module({
  imports: [EquiposModule, EdicionModule],
  controllers: [ResultadosController],
  providers: [ResultadosService, ResultadosRepository],
})
export class ResultadosModule {}
