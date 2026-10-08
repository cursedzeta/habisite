import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Publico } from '../comun/autorizacion/publico.decorador.js';
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

  @Publico()
  @Get('edicion/publica')
  @ApiOperation({
    summary: 'Lo que la landing puede saber del concurso, sin sesión',
    description:
      'Para el formulario: a dónde enlaza «las bases» (`terminosUrl`, `null` mientras no ' +
      'estén publicadas) y en qué etapa está el concurso. Nada interno.',
  })
  async publica() {
    const { estado, cierreEntregas, zonaHoraria, terminosUrl } = await this.edicion.obtener();
    return {
      estado,
      cierreEntregas: cierreEntregas?.toISOString() ?? null,
      zonaHoraria,
      terminosUrl,
    };
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
