import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import type { Entorno } from '../configuracion/entorno.js';
import { EquiposService } from '../equipos/equipos.service.js';
import type { Perfil } from '../perfiles/perfil.entity.js';
import { PerfilesRepository } from '../perfiles/perfiles.repository.js';

/**
 * Un token que habilita a entrar a alguien que no está en la lista blanca:
 * la invitación individual por correo, o el enlace del equipo (docs/05).
 */
export interface AccesoPorInvitacion {
  tipo: 'invitacion' | 'equipo';
  token: string;
}

/** Lo que viaja firmado en el `state` de OAuth, para volver donde estábamos. */
interface ContenidoEstado {
  retorno: string;
  acceso?: AccesoPorInvitacion;
}

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);
  private readonly google: OAuth2Client;

  constructor(
    private readonly config: ConfigService<Entorno, true>,
    private readonly jwt: JwtService,
    private readonly perfiles: PerfilesRepository,
    private readonly equipos: EquiposService,
  ) {
    this.google = new OAuth2Client({
      clientId: config.get('GOOGLE_CLIENT_ID', { infer: true }),
      clientSecret: config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
      redirectUri: config.get('GOOGLE_CALLBACK_URL', { infer: true }),
    });
  }

  /**
   * A dónde mandar al navegador para que Google pida el consentimiento.
   * El `state` va firmado: es lo que impide que alguien fabrique una vuelta
   * de callback desde otro sitio (CSRF).
   */
  urlDeIngreso(retorno: string, acceso?: AccesoPorInvitacion): string {
    const estado = this.jwt.sign({ retorno, acceso } satisfies ContenidoEstado, { expiresIn: '10m' });
    return this.google.generateAuthUrl({
      scope: ['openid', 'email', 'profile'],
      state: estado,
      // Sin acceso offline: no guardamos refresh tokens de Google, la sesión
      // es nuestra. Menos que custodiar.
      prompt: 'select_account',
    });
  }

  /**
   * Canjea el código por el id_token —servidor a servidor, el secret nunca sale
   * de acá— y resuelve a qué perfil corresponde.
   *
   * Devuelve `null` cuando la cuenta no está en la lista blanca: el que llama
   * decide qué mostrarle.
   */
  async resolverVuelta(codigo: string, estado: string): Promise<{ perfil: Perfil | null; retorno: string }> {
    let retorno = '/';
    let acceso: AccesoPorInvitacion | undefined;
    try {
      ({ retorno, acceso } = this.jwt.verify<ContenidoEstado>(estado));
    } catch {
      throw new UnauthorizedException('El ingreso venció o vino de otro lado. Probá de nuevo.');
    }

    const { tokens } = await this.google.getToken(codigo);
    if (!tokens.id_token) {
      throw new UnauthorizedException('Google no devolvió la identidad');
    }

    const ticket = await this.google.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.config.get('GOOGLE_CLIENT_ID', { infer: true }),
    });
    const datos = ticket.getPayload();

    if (!datos?.email || !datos.sub) {
      throw new UnauthorizedException('Google no devolvió un correo');
    }
    // Sin este chequeo, una cuenta de Workspace mal configurada puede afirmar
    // un correo que no es suyo.
    if (!datos.email_verified) {
      throw new ForbiddenException('Tu correo de Google no está verificado');
    }

    const perfil = await this.vincular(datos.sub, datos.email, datos.given_name, datos.family_name, acceso);
    return { perfil, retorno };
  }

  /**
   * La lista blanca. El orden importa:
   *
   *   1. Por `google_sub`, que es el identificador estable de Google.
   *   2. Si no, por correo — y ahí se graba el sub. Es el paso que hace que
   *      un jurado invitado herede el rol que administración le dejó puesto.
   *   3. Si tampoco, pero trae un token de invitación válido, se le crea el
   *      perfil: la invitación es la que lo habilita. Es lo que hace que el
   *      enlace del correo sirva con cualquier cuenta de Google (docs/05).
   *   4. Si no, no hay perfil: no entra.
   */
  private async vincular(
    googleSub: string,
    correo: string,
    nombre?: string,
    apellido?: string,
    acceso?: AccesoPorInvitacion,
  ): Promise<Perfil | null> {
    const porSub = await this.perfiles.porGoogleSub(googleSub);
    if (porSub) return porSub;

    const porCorreo = await this.perfiles.porCorreo(correo);
    if (!porCorreo) {
      if (acceso && (await this.equipos.tokenHabilitaIngreso(acceso.tipo, acceso.token))) {
        this.log.log(`Ingreso habilitado por ${acceso.tipo}: ${correo}`);
        return this.perfiles.crearConGoogle(correo, googleSub, nombre, apellido);
      }
      this.log.warn(`Ingreso rechazado: ${correo} no está inscripto`);
      return null;
    }
    if (porCorreo.googleSub && porCorreo.googleSub !== googleSub) {
      // Ese correo ya está atado a otra cuenta de Google.
      throw new ForbiddenException('Ese correo ya está vinculado a otra cuenta');
    }
    return this.perfiles.vincularGoogle(porCorreo.id, googleSub, nombre, apellido);
  }
}
