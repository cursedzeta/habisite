import { Body, Controller, Get, HttpCode, Param, Post, Put, Req, Res } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiFoundResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Publico } from '../comun/autorizacion/publico.decorador.js';
import { Roles } from '../comun/autorizacion/roles.decorador.js';
import { UsuarioActual } from '../comun/autorizacion/usuario-actual.decorador.js';
import type { UsuarioSesion } from '../comun/autorizacion/usuario-sesion.js';
import { ipDelCliente } from '../comun/red/ip-del-cliente.js';
import {
  DatosParaCompletarDto,
  DatosPersonalesDto,
  InscripcionDto,
  RespuestaInscripcionDto,
} from './dto/inscripcion.dto.js';
import { InvitarJuradoDto, JuradoDto } from './dto/jurado.dto.js';
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
      '`perfilCompleto` dice si hay que pedirle datos antes, y `edicion` evita tener ' +
      'que pedir la configuración aparte.',
  })
  @ApiOkResponse({ type: YoDto })
  @ApiUnauthorizedResponse({ description: 'Sin sesión, o la sesión venció' })
  yo(@UsuarioActual() usuario: UsuarioSesion): Promise<YoDto> {
    return this.perfiles.yo(usuario.id);
  }

  @Put('yo')
  @ApiOperation({
    summary: 'Completa o corrige los datos personales desde el panel',
    description:
      'Lo que se manda reemplaza a lo que había; lo que no se manda queda igual. ' +
      'Es la pantalla que ve primero quien se inscribió solo con el correo.',
  })
  @ApiOkResponse({ type: YoDto })
  actualizarDatos(
    @UsuarioActual() usuario: UsuarioSesion,
    @Body() datos: DatosPersonalesDto,
  ): Promise<YoDto> {
    return this.perfiles.actualizarDatos(usuario.id, datos);
  }

  @Publico()
  @Post('inscripcion')
  @HttpCode(200)
  @ApiOperation({
    summary: 'El formulario de inscripción de la landing',
    description:
      'Solo `correo`, `aceptaBases` y `turnstileToken` son obligatorios. Habilita en el ' +
      'acto para entrar con Google. Un correo que ya estaba recibe exactamente la misma ' +
      'respuesta que uno nuevo, a propósito. Ver docs/11-formulario-para-el-front.md.',
  })
  @ApiOkResponse({ type: RespuestaInscripcionDto })
  @ApiForbiddenResponse({ description: 'Turnstile no aprobó el envío: resetear el widget' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados envíos desde la misma IP' })
  inscribir(@Body() datos: InscripcionDto, @Req() peticion: Request): Promise<RespuestaInscripcionDto> {
    return this.perfiles.inscribir(datos, ipDelCliente(peticion));
  }

  @Publico()
  @Get('inscripcion/completar/:token')
  @ApiOperation({
    summary: 'Los datos para precargar el formulario desde «Completar mi inscripción»',
    description: 'El token viene en el correo de alerta. Deja de servir cuando la inscripción se completa.',
  })
  @ApiOkResponse({ type: DatosParaCompletarDto })
  @ApiNotFoundResponse({ description: 'El token no existe o ya se usó: mostrar el formulario vacío' })
  paraCompletar(@Param('token') token: string): Promise<DatosParaCompletarDto> {
    return this.perfiles.paraCompletar(token);
  }

  @Publico()
  @Get('r/:token')
  @ApiOperation({
    summary: 'El enlace al grupo de WhatsApp',
    description:
      'Anota el clic y redirige al grupo. Es el enlace de todos los correos y de la ' +
      'pantalla de gracias: así se frena el recordatorio, y el grupo se puede cambiar ' +
      'sin reenviar nada. Es una navegación, no un fetch.',
  })
  @ApiFoundResponse({ description: 'Redirige al grupo de WhatsApp' })
  async alGrupo(@Param('token') token: string, @Res() respuesta: Response): Promise<void> {
    respuesta.redirect(302, await this.perfiles.clicAlGrupo(token));
  }

  @Roles('admin')
  @Post('admin/jurados')
  @ApiOperation({
    summary: 'Invita a un jurado',
    description:
      'Se invita uno por uno. Le llega un correo con el enlace para entrar con Google; ' +
      'tiene que usar la cuenta de ESE correo.',
  })
  @ApiOkResponse({ type: JuradoDto })
  @ApiConflictResponse({ description: 'El correo es de un admin o de alguien inscripto como concursante' })
  async invitarJurado(@Body() datos: InvitarJuradoDto): Promise<JuradoDto> {
    const jurado = await this.perfiles.invitarJurado(datos.correo, datos.nombre, datos.apellido);
    return {
      id: jurado.id,
      correo: jurado.correo,
      nombre: jurado.nombre,
      apellido: jurado.apellido,
      estado: jurado.estado,
    };
  }
}
