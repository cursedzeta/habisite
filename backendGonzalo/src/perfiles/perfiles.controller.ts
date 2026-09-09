import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Publico } from '../comun/autorizacion/publico.decorador.js';
import { UsuarioActual } from '../comun/autorizacion/usuario-actual.decorador.js';
import type { UsuarioSesion } from '../comun/autorizacion/usuario-sesion.js';
import { InscripcionDto } from './dto/inscripcion.dto.js';
import { YoDto } from './dto/yo.dto.js';
import { PerfilesService } from './perfiles.service.js';

@ApiTags('Perfil')
@Controller()
export class PerfilesController {
  constructor(private readonly perfiles: PerfilesService) {}

  @Get('yo')
  @ApiOperation({
    summary: 'Quién está logueado, con qué rol y en qué estado está el concurso',
    description:
      'La primera llamada de todas las pantallas: de `rol` sale a qué panel entra, ' +
      'y `edicion` evita tener que pedir la configuración aparte.',
  })
  @ApiOkResponse({ type: YoDto })
  @ApiUnauthorizedResponse({ description: 'Sin sesión, o la sesión venció' })
  yo(@UsuarioActual() usuario: UsuarioSesion): Promise<YoDto> {
    return this.perfiles.yo(usuario.id);
  }

  @Publico()
  @Post('inscripcion')
  @ApiOperation({
    summary: 'Alta desde el formulario del concurso',
    description:
      'Habilita la cuenta en el acto. Nadie puede entrar con una cuenta de Google ' +
      'que no se haya inscripto acá antes.',
  })
  @ApiConflictResponse({ description: 'Ese correo ya está inscripto' })
  async inscribir(@Body() datos: InscripcionDto) {
    const perfil = await this.perfiles.inscribir(datos);
    return { id: perfil.id, correo: perfil.correo };
  }
}
