import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions, Response } from 'express';
import type { Entorno } from '../configuracion/entorno.js';

export const COOKIE_SESION = 'sesion';

/** Lo que viaja adentro del JWT. El rol NO: se lee de la base en cada request. */
export interface ContenidoSesion {
  sub: string; // id del perfil
  v: number; // sesion_v, para poder invalidar sin tabla de sesiones
}

@Injectable()
export class SesionService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Entorno, true>,
  ) {}

  /** Emite la cookie de sesión sobre la respuesta. */
  emitir(respuesta: Response, perfilId: string, sesionV: number): void {
    const token = this.jwt.sign({ sub: perfilId, v: sesionV } satisfies ContenidoSesion);
    respuesta.cookie(COOKIE_SESION, token, this.opciones());
  }

  /** Vence la cookie. Las opciones tienen que coincidir con las de emitir(). */
  borrar(respuesta: Response): void {
    respuesta.clearCookie(COOKIE_SESION, this.opciones());
  }

  async leer(token: string): Promise<ContenidoSesion> {
    return this.jwt.verifyAsync<ContenidoSesion>(token);
  }

  private opciones(): CookieOptions {
    return {
      httpOnly: true, // el JavaScript de la página no la puede leer
      secure: this.config.get('COOKIE_SEGURA', { infer: true }),
      // Lax y no None: front y API comparten dominio registrable, así que son
      // same-site. Con None, Safari y los bloqueadores la descartan.
      sameSite: 'lax',
      domain: this.config.get('COOKIE_DOMAIN', { infer: true }) || undefined,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }
}
