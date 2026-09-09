import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CLAVE_PUBLICO } from '../comun/autorizacion/publico.decorador.js';
import type { RequestConUsuario } from '../comun/autorizacion/usuario-sesion.js';
import { PerfilesRepository } from '../perfiles/perfiles.repository.js';
import { COOKIE_SESION, SesionService } from './sesion.service.js';

/*
 * Resuelve quién está haciendo la petición y lo cuelga en `request.usuario`.
 *
 * Registrado como guard global ANTES que RolGuard: los guards globales corren
 * en el orden en que se declaran en AppModule, y RolGuard necesita el usuario
 * que este deja puesto.
 *
 * El rol se lee de la base en cada request, nunca del token: si administración
 * bloquea a alguien, deja de entrar en el acto y no cuando venza su cookie.
 */
@Injectable()
export class SesionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sesiones: SesionService,
    private readonly perfiles: PerfilesRepository,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const esPublico = this.reflector.getAllAndOverride<boolean | undefined>(CLAVE_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    const peticion = contexto.switchToHttp().getRequest<RequestConUsuario>();
    const token = peticion.cookies?.[COOKIE_SESION] as string | undefined;

    if (!token) {
      if (esPublico) return true;
      throw new UnauthorizedException('Hace falta iniciar sesión');
    }

    let contenido;
    try {
      contenido = await this.sesiones.leer(token);
    } catch {
      if (esPublico) return true;
      throw new UnauthorizedException('La sesión venció o no es válida');
    }

    const perfil = await this.perfiles.porId(contenido.sub);

    if (!perfil) {
      if (esPublico) return true;
      throw new UnauthorizedException('La sesión ya no corresponde a nadie');
    }
    if (perfil.estado === 'bloqueado') {
      throw new ForbiddenException('Tu cuenta está bloqueada');
    }
    // Subir sesion_v en la base echa a esa persona sin tabla de sesiones.
    if (perfil.sesionV !== contenido.v) {
      if (esPublico) return true;
      throw new UnauthorizedException('La sesión fue invalidada');
    }

    peticion.usuario = { id: perfil.id, rol: perfil.rol };
    return true;
  }
}
