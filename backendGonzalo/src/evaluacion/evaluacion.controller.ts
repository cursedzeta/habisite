import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Put, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../comun/autorizacion/roles.decorador.js';
import { UsuarioActual } from '../comun/autorizacion/usuario-actual.decorador.js';
import type { UsuarioSesion } from '../comun/autorizacion/usuario-sesion.js';
import { PropuestasService } from '../propuestas/propuestas.service.js';
import {
  AvanceDto,
  CriterioDto,
  DevolucionDto,
  GuardarPuntajesDto,
  PreseleccionarDto,
  PropuestaJuradoDto,
} from './dto/evaluacion.dto.js';
import { EvaluacionService } from './evaluacion.service.js';

@ApiTags('Evaluación')
@Controller()
export class EvaluacionController {
  constructor(
    private readonly evaluacion: EvaluacionService,
    private readonly propuestas: PropuestasService,
  ) {}

  @Get('criterios')
  @ApiOperation({
    summary: 'Los criterios de evaluación con sus pesos',
    description:
      'La pantalla de puntuación tiene que generarse desde acá: los criterios no están ' +
      'confirmados y van a cambiar. Nada de siete campos incrustados.',
  })
  @ApiOkResponse({ type: [CriterioDto] })
  criterios() {
    return this.evaluacion.criterios();
  }

  @Roles('jurado', 'admin')
  @Get('jurado/propuestas')
  @ApiOperation({
    summary: 'Las propuestas que le tocan a este jurado',
    description:
      'En preselección son las de su tercio; en la final, todos los finalistas. ' +
      '`criteriosPuntuados` sobre `criteriosTotales` arma el «3 de 7».',
  })
  @ApiOkResponse({ type: [PropuestaJuradoDto] })
  listado(@UsuarioActual() usuario: UsuarioSesion) {
    return this.evaluacion.listado(usuario.id);
  }

  @Roles('jurado', 'admin')
  @Get('jurado/avance')
  @ApiOperation({ summary: 'Cuántas le faltan a este jurado' })
  @ApiOkResponse({ type: AvanceDto })
  avance(@UsuarioActual() usuario: UsuarioSesion) {
    return this.evaluacion.avance(usuario.id);
  }

  @Roles('jurado', 'admin')
  @Get('jurado/propuestas/:id/archivo')
  @ApiOperation({
    summary: 'El PDF de una propuesta, para leerlo en la plataforma',
    description:
      'Soporta `Range`: el visor abre en cuanto tiene el índice, sin bajar los 30 MB primero. ' +
      'Es lo que evita que el jurado tenga que descargarse todo.',
  })
  async archivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('range') rango: string | undefined,
    @Res() respuesta: Response,
  ): Promise<void> {
    await this.propuestas.porId(id);
    await this.propuestas.servirArchivo(id, rango, respuesta);
  }

  @Roles('jurado', 'admin')
  @Get('jurado/propuestas/:id/puntajes')
  @ApiOperation({
    summary: 'Los puntajes cargados de una propuesta',
    description:
      'Hasta que la evaluación cierra, cada jurado ve solo los suyos: si el segundo ve el 9 ' +
      'que puso el primero, tiende a acercarse a ese número.',
  })
  puntajes(@Param('id', ParseUUIDPipe) id: string, @UsuarioActual() usuario: UsuarioSesion) {
    return this.evaluacion.puntajes(id, usuario.id);
  }

  @Roles('jurado', 'admin')
  @Put('jurado/propuestas/:id/preseleccion')
  @ApiOperation({
    summary: 'Vuelta 1: marca si la propuesta pasa a la final',
    description: 'Acá no se pone nota: el jurado solo decide qué pasa de ronda.',
  })
  preseleccionar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioActual() usuario: UsuarioSesion,
    @Body() datos: PreseleccionarDto,
  ) {
    return this.evaluacion.preseleccionar(id, usuario.id, datos.elegida);
  }

  @Roles('jurado', 'admin')
  @Put('jurado/propuestas/:id/puntajes')
  @ApiOperation({
    summary: 'Vuelta 2: puntúa los criterios',
    description: 'Se puede mandar parcial y completar después.',
  })
  guardarPuntajes(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioActual() usuario: UsuarioSesion,
    @Body() datos: GuardarPuntajesDto,
  ) {
    return this.evaluacion.guardarPuntajes(id, usuario.id, datos.puntajes);
  }

  @Roles('jurado', 'admin')
  @Get('jurado/propuestas/:id/devolucion')
  @ApiOperation({ summary: 'La devolución que escribió este jurado' })
  verDevolucion(@Param('id', ParseUUIDPipe) id: string, @UsuarioActual() usuario: UsuarioSesion) {
    return this.evaluacion.devolucion(id, usuario.id).then((texto) => ({ texto }));
  }

  @Roles('jurado', 'admin')
  @Put('jurado/propuestas/:id/devolucion')
  @ApiOperation({
    summary: 'Escribe la devolución',
    description: 'Opcional, y es una nota interna: el concursante no la ve.',
  })
  guardarDevolucion(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioActual() usuario: UsuarioSesion,
    @Body() datos: DevolucionDto,
  ) {
    return this.evaluacion.guardarDevolucion(id, usuario.id, datos.texto);
  }

  @Roles('admin')
  @Post('admin/reparto')
  @ApiOperation({
    summary: 'Reparte las propuestas entre los jurados, al azar',
    description:
      'Guarda la semilla: si alguien cuestiona el sorteo, se vuelve a correr y da idéntico.',
  })
  repartir() {
    return this.evaluacion.repartir();
  }
}
