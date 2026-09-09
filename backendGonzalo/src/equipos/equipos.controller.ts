import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Req } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UsuarioActual } from '../comun/autorizacion/usuario-actual.decorador.js';
import type { UsuarioSesion } from '../comun/autorizacion/usuario-sesion.js';
import { AceptarInvitacionDto, CrearEquipoDto, EquipoDto, InvitarDto } from './dto/equipos.dto.js';
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
  mio(@UsuarioActual() usuario: UsuarioSesion) {
    return this.equipos.mio(usuario.id);
  }

  @Post('mi-equipo')
  @ApiOperation({
    summary: 'Arma un equipo',
    description: 'Se puede crear vacío y sumar gente después. Crea también la propuesta en borrador.',
  })
  @ApiOkResponse({ type: EquipoDto })
  crear(@UsuarioActual() usuario: UsuarioSesion, @Body() datos: CrearEquipoDto) {
    return this.equipos.crear(usuario.id, datos.nombre);
  }

  @Post('mi-equipo/invitaciones')
  @ApiOperation({
    summary: 'Invita integrantes por correo',
    description:
      'Solo el líder. Devuelve el enlace de cada invitación, que es el que va en el correo.',
  })
  invitar(@UsuarioActual() usuario: UsuarioSesion, @Body() datos: InvitarDto) {
    return this.equipos.invitar(usuario.id, datos.correos);
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
      'correo tenga que coincidir. Registra la aceptación de las bases con fecha e IP.',
  })
  @ApiOkResponse({ type: EquipoDto })
  sumarme(
    @Param('token') token: string,
    @UsuarioActual() usuario: UsuarioSesion,
    @Body() datos: AceptarInvitacionDto,
    @Req() peticion: Request,
  ) {
    return this.equipos.aceptarPorEnlace(token, usuario.id, datos.terminosVersion, peticion.ip ?? null);
  }

  @Delete('mi-equipo/miembros/yo')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Se da de baja del equipo',
    description:
      'Los demás siguen con la propuesta. Después del cierre ya no se puede: la lista ' +
      'de autores queda firme.',
  })
  @ApiNoContentResponse()
  baja(@UsuarioActual() usuario: UsuarioSesion) {
    return this.equipos.darseDeBaja(usuario.id);
  }
}
