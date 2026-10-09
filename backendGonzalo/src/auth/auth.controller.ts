import { Body, Controller, Get, HttpCode, Post, Query, Redirect, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Publico } from '../comun/autorizacion/publico.decorador.js';
import { ipDelCliente } from '../comun/red/ip-del-cliente.js';
import type { Entorno } from '../configuracion/entorno.js';
import { AuthService } from './auth.service.js';
import { CanjearEnlaceDto, PedirEnlaceDto, RespuestaCanjeDto } from './dto/enlace-ingreso.dto.js';
import { EnlaceIngresoService } from './enlace-ingreso.service.js';
import { SesionService } from './sesion.service.js';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sesiones: SesionService,
    private readonly enlace: EnlaceIngresoService,
    private readonly config: ConfigService<Entorno, true>,
  ) {}

  /**
   * Arranca el ingreso. El front no necesita el SDK de Google: le alcanza con
   * mandar al navegador acá, por ejemplo con un `<a href>`.
   */
  @Publico()
  @Get('google')
  @Redirect()
  @ApiOperation({
    summary: 'Arranca el ingreso con Google',
    description:
      'Redirige a Google (302). No es una llamada de fetch: el navegador tiene que navegar acá. ' +
      '`retorno` es la ruta del front a la que volver después de entrar. ' +
      '`invitacion` (el token del correo de invitación) o `equipo` (el token del enlace del ' +
      'equipo) dejan entrar a una cuenta de Google que todavía no está inscripta.',
  })
  ingresar(
    @Query('retorno') retorno = '/',
    @Query('invitacion') invitacion?: string,
    @Query('equipo') equipo?: string,
  ) {
    // Solo rutas internas: sin esto, `?retorno=https://otro-sitio` convierte
    // el login en un redirector abierto para phishing.
    const destino = retorno.startsWith('/') && !retorno.startsWith('//') ? retorno : '/';
    const acceso = invitacion
      ? { tipo: 'invitacion' as const, token: invitacion }
      : equipo
        ? { tipo: 'equipo' as const, token: equipo }
        : undefined;
    return { url: this.auth.urlDeIngreso(destino, acceso) };
  }

  /** A dónde vuelve Google. No lo llama el front. */
  @Publico()
  @Get('google/callback')
  @ApiExcludeEndpoint()
  async vuelta(
    @Query('code') codigo: string | undefined,
    @Query('state') estado: string | undefined,
    @Query('error') error: string | undefined,
    @Res() respuesta: Response,
  ): Promise<void> {
    const front = this.config.get('FRONTEND_URL', { infer: true });

    // El usuario canceló en la pantalla de Google.
    if (error || !codigo || !estado) {
      respuesta.redirect(`${front}/ingresar?error=cancelado`);
      return;
    }

    const { perfil, retorno } = await this.auth.resolverVuelta(codigo, estado);

    // La cuenta no está inscripta. El mensaje es genérico a propósito: decir
    // «ese correo no figura» filtraría quiénes están inscriptos.
    if (!perfil) {
      respuesta.redirect(`${front}/ingresar?error=sin-acceso`);
      return;
    }

    this.sesiones.emitir(respuesta, perfil.id, perfil.sesionV);
    respuesta.redirect(`${front}${retorno}`);
  }

  /** La alternativa a Google: un enlace por correo (docs/12). */
  @Publico()
  @Post('enlace')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Pide un enlace de ingreso por correo',
    description:
      'Responde 204 siempre, esté o no inscripto el correo: decir «no figura» filtraría ' +
      'quiénes se anotaron. Si está, le llega un enlace que vence a los 15 minutos y sirve una vez.',
  })
  async pedirEnlace(@Body() datos: PedirEnlaceDto, @Req() peticion: Request): Promise<void> {
    await this.enlace.pedir(datos.correo, datos.retorno ?? '/', ipDelCliente(peticion));
  }

  @Publico()
  @Post('enlace/canjear')
  @HttpCode(200)
  @ApiOkResponse({ type: RespuestaCanjeDto })
  @ApiOperation({
    summary: 'Canjea el enlace del correo por una sesión',
    description:
      'Lo llama el front desde /ingresar?enlace=…, con `credentials: include`. Es un POST y no ' +
      'un GET a propósito: los antivirus de correo abren los enlaces para revisarlos y gastarían ' +
      'el de un solo uso. 401 si venció o ya se usó.',
  })
  async canjearEnlace(
    @Body() datos: CanjearEnlaceDto,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<RespuestaCanjeDto> {
    const { perfil, retorno } = await this.enlace.canjear(datos.token);
    this.sesiones.emitir(respuesta, perfil.id, perfil.sesionV);
    return { retorno };
  }

  @Publico()
  @Post('salir')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cierra la sesión' })
  salir(@Res({ passthrough: true }) respuesta: Response): void {
    this.sesiones.borrar(respuesta);
  }
}
