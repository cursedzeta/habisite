import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CLAVE_ROLES } from './roles.decorador.js';
import type { RequestConUsuario, Rol } from './usuario-sesion.js';

/*
 * Registrado como guard global. Solo actúa sobre rutas marcadas con @Roles();
 * las demás pasan sin mirar nada.
 *
 * Depende de que el guard de sesión (módulo auth) haya colgado
 * `request.usuario` antes: los guards globales corren en el orden en que se
 * registran en AppModule.
 */
@Injectable()
export class RolGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(
      CLAVE_ROLES,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (!roles || roles.length === 0) return true;

    const { usuario } = contexto.switchToHttp().getRequest<RequestConUsuario>();
    if (!usuario) throw new UnauthorizedException('Hace falta iniciar sesión');
    if (!roles.includes(usuario.rol)) {
      throw new ForbiddenException('Tu rol no puede hacer esto');
    }
    return true;
  }
}
