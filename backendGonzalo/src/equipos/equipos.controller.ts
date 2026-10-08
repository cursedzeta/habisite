import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Req, Res } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Publico } from '../comun/autorizacion/publico.decorador.js';
import { UsuarioActual } from '../comun/autorizacion/usuario-actual.decorador.js';
import type { UsuarioSesion } from '../comun/autorizacion/usuario-sesion.js';
import { ipDelCliente } from '../comun/red/ip-del-cliente.js';
import {
  AceptarInvitacionDto,
  CrearEquipoDto,
  EquipoDto,
  InvitacionDto,
  InvitarDto,
} from './dto/equipos.dto.js';
import { EquiposService } from './equipos.service.js';

@ApiTags('Equipos')
@Controller()
export class EquiposController {
  constructor(private readonly equipos: EquiposService) {}

  @Get('mi-equipo')
  @ApiOperation({
    summary: 'El equipo de quien pregunta',
    description: 'Devuelve `null` si todavía no armó ni se sumó a ninguno.',
  })
  @ApiOkResponse({ type: EquipoDto, description: 'El equipo, o null' })
  // Se responde con `@Res` a propósito: si el handler devolviera `null` suelto,
  // Nest manda un cuerpo VACÍO y el `await r.json()` del front explota. Y este
  // es el estado inicial de todo el panel, así que reventaría en la primera
  // pantalla. Con `res.json()` viaja el literal `null`, que es lo que promete
  // el contrato.
  async mio(@UsuarioActual() usuario: UsuarioSesion, @Res() respuesta: Response) {
    respuesta.json(await this.equipos.mio(usuario.id));
  }

  @Post('mi-equipo')
  @ApiOperation({
    summary: 'Arma un equipo',
    description:
      'Se puede crear vacío y sumar gente después. Crea también la propuesta en borrador. ' +
      'Responde 403 si quien lo pide no completó sus datos (`perfilCompleto` en `/yo`).',
  })
  @ApiOkResponse({ type: EquipoDto })
  crear(@UsuarioActual() usuario: UsuarioSesion, @Body() datos: CrearEquipoDto) {
    return this.equipos.crear(usuario.id, datos.nombre);
  }

  @Post('mi-equipo/invitaciones')
  @ApiOperation({
    summary: 'Invita integrantes por correo',
    description:
      'Solo el líder. A cada dirección le llega un correo con su enlace. Devuelve los ' +
      'enlaces igual, por si hace falta pasarlos por otro lado.',
  })
  invitar(@UsuarioActual() usuario: UsuarioSesion, @Body() datos: InvitarDto) {
    return this.equipos.invitar(usuario.id, datos.correos);
  }

  @Publico()
  @Get('invitacion/:token')
  @ApiOperation({
    summary: 'Qué equipo invita, para mostrarlo antes del login',
    description:
      'La pantalla `/invitacion/{token}` del front. Después, el botón manda a ' +
      '`/auth/google?invitacion={token}&retorno=/invitacion/{token}` y, de vuelta, llama a ' +
      '`POST /invitacion/{token}/aceptar`.',
  })
  @ApiOkResponse({ type: InvitacionDto })
  @ApiNotFoundResponse({ description: 'No existe, o ya se aceptó' })
  verInvitacion(@Param('token') token: string) {
    return this.equipos.verInvitacion(token);
  }

  @Post('invitacion/:token/aceptar')
  @ApiOperation({
    summary: 'Acepta la invitación por correo',
    description:
      'Sirve con cualquier cuenta de Google, no solo la del correo invitado: el token es ' +
      'lo que identifica la invitación. Registra la aceptación de las bases con fecha, ' +
      'la versión vigente y la IP.',
  })
  @ApiOkResponse({ type: EquipoDto })
  @ApiConflictResponse({ description: 'Ya forma parte de otro equipo' })
  aceptarInvitacion(
    @Param('token') token: string,
    @UsuarioActual() usuario: UsuarioSesion,
    @Req() peticion: Request,
  ) {
    return this.equipos.aceptarInvitacion(token, usuario.id, ipDelCliente(peticion));
  }

  @Put('mi-equipo/enlace')
  @ApiOperation({
    summary: 'Genera un enlace nuevo e invalida el anterior',
    description: 'Solo el líder. Sirve si el enlace circuló más de la cuenta.',
  })
  regenerar(@UsuarioActual() usuario: UsuarioSesion) {
    return this.equipos.regenerarEnlace(usuario.id);
  }

  @Delete('mi-equipo/enlace')
  @HttpCode(204)
  @ApiOperation({ summary: 'Apaga el enlace cuando el equipo está completo' })
  @ApiNoContentResponse()
  apagarEnlace(@UsuarioActual() usuario: UsuarioSesion) {
    return this.equipos.activarEnlace(usuario.id, false);
  }

  @Post('equipos/sumarme/:token')
  @ApiOperation({
    summary: 'Se suma a un equipo con el enlace compartido',
    description:
      'El camino sin fricción: sirve con cualquier cuenta de Google, sin que ningún ' +
      'correo tenga que coincidir. Para entrar sin estar inscripto, el login va con ' +
      '`/auth/google?equipo={token}`. Registra la aceptación de las bases con fecha, la ' +
      'versión vigente y la IP.',
  })
  @ApiOkResponse({ type: EquipoDto })
  sumarme(
    @Param('token') token: string,
    @UsuarioActual() usuario: UsuarioSesion,
    // Se sigue aceptando el cuerpo viejo ({ terminosVersion }), pero se ignora.
    @Body() _datos: AceptarInvitacionDto,
    @Req() peticion: Request,
  ) {
    return this.equipos.aceptarPorEnlace(token, usuario.id, ipDelCliente(peticion));
  }

  @Delete('mi-equipo/miembros/yo')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Se da de baja del equipo',
    description:
      'Los demás siguen con la propuesta y reciben un correo avisando. Después del cierre ' +
      'ya no se puede: la lista de autores queda firme.',
  })
  @ApiNoContentResponse()
  baja(@UsuarioActual() usuario: UsuarioSesion) {
    return this.equipos.darseDeBaja(usuario.id);
  }
}
