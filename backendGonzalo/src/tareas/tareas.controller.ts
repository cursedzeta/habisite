import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../comun/autorizacion/roles.decorador.js';
import { TareaPeriodicaService } from './tarea-periodica.service.js';

@ApiTags('Administración')
@Controller()
export class TareasController {
  constructor(private readonly tarea: TareaPeriodicaService) {}

  @Roles('admin')
  @Post('admin/tarea')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Corre ahora la tarea periódica',
    description:
      'Lo mismo que hace sola cada 30 minutos: cierra las entregas si venció el plazo, ' +
      'manda los recordatorios vencidos y reintenta los correos que no salieron. ' +
      'Es seguro correrla de más: nada sale dos veces.',
  })
  @ApiOkResponse({ description: '{ cierreDeEntregas, recordatorios, correosReintentados }' })
  ejecutar() {
    return this.tarea.ejecutar();
  }
}
