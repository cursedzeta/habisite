import { Controller, Get, HttpCode, Post, Query, Redirect, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Publico } from '../comun/autorizacion/publico.decorador.js';
import type { Entorno } from '../configuracion/entorno.js';
import { AuthService } from './auth.service.js';
import { SesionService } from './sesion.service.js';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sesiones: SesionService,
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
      '`retorno` es la ruta del front a la que volver después de entrar.',
  })
  ingresar(@Query('retorno') retorno = '/') {
    // Solo rutas internas: sin esto, `?retorno=https://otro-sitio` convierte
    // el login en un redirector abierto para phishing.
    const destino = retorno.startsWith('/') && !retorno.startsWith('//') ? retorno : '/';
    return { url: this.auth.urlDeIngreso(destino) };
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

  @Publico()
  @Post('salir')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cierra la sesión' })
  salir(@Res({ passthrough: true }) respuesta: Response): void {
    this.sesiones.borrar(respuesta);
  }
}
