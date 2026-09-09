import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../comun/autorizacion/roles.decorador.js';
import { ActualizarEdicionDto, CambiarEstadoDto } from './dto/edicion.dto.js';
import { EdicionService } from './edicion.service.js';

@ApiTags('Edición')
@Controller()
export class EdicionController {
  constructor(private readonly edicion: EdicionService) {}

  @Get('edicion')
  @ApiOperation({
    summary: 'Configuración y estado del concurso',
    description: 'Lo mismo que viaja adentro de `GET /yo`. Está suelto por si hace falta refrescarlo.',
  })
  obtener() {
    return this.edicion.obtener();
  }

  @Roles('admin')
  @Put('admin/edicion')
  @ApiOperation({ summary: 'Cambia fechas y topes del concurso' })
  actualizar(@Body() cambios: ActualizarEdicionDto) {
    return this.edicion.actualizar(cambios);
  }

  @Roles('admin')
  @Put('admin/edicion/estado')
  @ApiOperation({
    summary: 'Mueve el concurso de etapa',
    description:
      'Pasar a `preseleccion` cierra las entregas: los borradores con archivo pasan a entregados.',
  })
  @ApiOkResponse({ description: 'La edición con su estado nuevo' })
  cambiarEstado(@Body() datos: CambiarEstadoDto) {
    return this.edicion.cambiarEstado(datos.estado);
  }
}
