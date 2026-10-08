import { Module } from '@nestjs/common';
import { EdicionModule } from '../edicion/edicion.module.js';
import { PerfilesModule } from '../perfiles/perfiles.module.js';
import { TareaPeriodicaService } from './tarea-periodica.service.js';
import { TareasController } from './tareas.controller.js';

@Module({
  imports: [EdicionModule, PerfilesModule],
  controllers: [TareasController],
  providers: [TareaPeriodicaService],
})
export class TareasModule {}
