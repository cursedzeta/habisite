import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { RequestConUsuario, UsuarioSesion } from './usuario-sesion.js';

/**
 * Quién está haciendo la petición, para usar en los controladores:
 *
 *   @Get('mi-propuesta')
 *   ver(@UsuarioActual() usuario: UsuarioSesion) { … }
 *
 * Lo cuelga SesionGuard. En una ruta @Publico() puede venir indefinido.
 */
export const UsuarioActual = createParamDecorator(
  (_datos: unknown, contexto: ExecutionContext): UsuarioSesion | undefined =>
    contexto.switchToHttp().getRequest<RequestConUsuario>().usuario,
);
