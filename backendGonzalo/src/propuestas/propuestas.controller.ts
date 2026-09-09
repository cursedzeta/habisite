import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Put,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { tmpdir } from 'node:os';
import { UsuarioActual } from '../comun/autorizacion/usuario-actual.decorador.js';
import type { UsuarioSesion } from '../comun/autorizacion/usuario-sesion.js';
import { ActualizarPropuestaDto, PropuestaDto } from './dto/propuestas.dto.js';
import { PropuestasService } from './propuestas.service.js';

@ApiTags('Propuesta')
@Controller('mi-propuesta')
export class PropuestasController {
  constructor(private readonly propuestas: PropuestasService) {}

  @Get()
  @ApiOperation({
    summary: 'La propuesta del equipo de quien pregunta',
    description: 'Devuelve `null` si todavía no armó equipo. `editable` dice si se puede tocar.',
  })
  @ApiOkResponse({ type: PropuestaDto, description: 'La propuesta, o null' })
  mia(@UsuarioActual() usuario: UsuarioSesion) {
    return this.propuestas.mia(usuario.id);
  }

  @Put()
  @ApiOperation({ summary: 'Guarda el título y la memoria' })
  @ApiOkResponse({ type: PropuestaDto })
  actualizar(@UsuarioActual() usuario: UsuarioSesion, @Body() datos: ActualizarPropuestaDto) {
    return this.propuestas.actualizar(usuario.id, datos.titulo, datos.memoria);
  }

  /*
   * `diskStorage` y no memoria: con varios equipos subiendo a la vez el último
   * día, el buffer en RAM tumba el contenedor. El archivo temporal se borra
   * siempre, salga bien o mal.
   */
  @Put('archivo')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: diskStorage({ destination: tmpdir() }),
      // Tope duro del framework. El de verdad sale de `edicion` y se comprueba
      // otra vez sobre los bytes reales.
      limits: { fileSize: 64 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['archivo'],
      properties: { archivo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Sube o reemplaza el PDF',
    description:
      'Un solo PDF por propuesta: subir de nuevo reemplaza el anterior. Se valida el tamaño, ' +
      'que sea realmente un PDF, que no tenga contraseña y la cantidad de páginas.',
  })
  @ApiOkResponse({ type: PropuestaDto })
  subir(@UsuarioActual() usuario: UsuarioSesion, @UploadedFile() archivo?: Express.Multer.File) {
    if (!archivo) throw new BadRequestException('No llegó ningún archivo');
    return this.propuestas.subirArchivo(
      usuario.id,
      archivo.path,
      archivo.originalname,
      archivo.size,
    );
  }

  @Get('archivo')
  @ApiOperation({
    summary: 'Descarga el PDF propio, para previsualizarlo',
    description: 'Soporta `Range`, así el visor carga de a pedazos en vez de bajar todo de una.',
  })
  async verArchivo(
    @UsuarioActual() usuario: UsuarioSesion,
    @Headers('range') rango: string | undefined,
    @Res() respuesta: Response,
  ): Promise<void> {
    const propuesta = await this.propuestas.mia(usuario.id);
    if (!propuesta) throw new BadRequestException('Todavía no tenés propuesta');
    await this.propuestas.servirArchivo(propuesta.id, rango, respuesta);
  }

  @Post('entregar')
  @ApiOperation({
    summary: 'Confirma la entrega',
    description:
      'Uno de los dos caminos a entregada. El otro es automático: al vencer el plazo, ' +
      'todo borrador que tenga archivo pasa a entregado igual.',
  })
  @ApiOkResponse({ type: PropuestaDto })
  entregar(@UsuarioActual() usuario: UsuarioSesion) {
    return this.propuestas.entregar(usuario.id);
  }
}
