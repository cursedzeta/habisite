import { createHash } from 'node:crypto';
import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { nuevoToken } from '../comun/tokens.js';
import { CorreoService } from '../correo/correo.service.js';
import { Enlaces } from '../correo/enlaces.js';
import type { Perfil } from '../perfiles/perfil.entity.js';
import { LimitadorInscripcion } from '../perfiles/limitador.js';
import { PerfilesRepository } from '../perfiles/perfiles.repository.js';
import { RUTA_INTERNA } from './dto/enlace-ingreso.dto.js';
import { EnlaceIngresoRepository } from './enlace-ingreso.repository.js';

/** Cuánto dura un enlace. Corto: es una llave que viaja por correo. */
const MINUTOS_VIGENCIA = 15;
/** Cuántos enlaces puede pedir una misma persona por ventana de vigencia. */
const MAXIMO_POR_PERSONA = 3;

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

/*
 * Ingreso con un enlace por correo (docs/12): la alternativa a Google para
 * quien no tiene Gmail. Sin contraseñas que custodiar ni recuperar.
 *
 * Vale la misma lista blanca que con Google: solo recibe enlace quien ya
 * está inscripto (o es jurado o admin). Y la respuesta al pedirlo es siempre
 * la misma, exista o no el correo: si no, el formulario serviría para
 * averiguar quién se anotó.
 */
@Injectable()
export class EnlaceIngresoService {
  private readonly log = new Logger(EnlaceIngresoService.name);

  constructor(
    private readonly repo: EnlaceIngresoRepository,
    private readonly perfiles: PerfilesRepository,
    private readonly correos: CorreoService,
    private readonly enlaces: Enlaces,
    // Instancia propia: cuenta los pedidos de enlace aparte de las inscripciones.
    private readonly limitador: LimitadorInscripcion,
  ) {}

  async pedir(correo: string, retorno: string, ip: string | null): Promise<void> {
    this.limitador.exigir(ip);

    const perfil = await this.perfiles.porCorreo(correo);
    if (!perfil || perfil.estado === 'bloqueado') {
      this.log.log(`Enlace de ingreso pedido para un correo sin acceso`);
      return;
    }
    // Más pedidos no lo hacen llegar más rápido; solo llenarían su casilla.
    if ((await this.repo.recientes(perfil.id, MINUTOS_VIGENCIA)) >= MAXIMO_POR_PERSONA) {
      this.log.warn(`Enlaces de ingreso agotados por ahora para ${perfil.id}`);
      return;
    }

    const token = nuevoToken();
    const id = await this.repo.crear(perfil.id, hash(token), retorno, MINUTOS_VIGENCIA, ip);
    await this.correos.encolar(
      'c14',
      perfil.correo,
      {
        nombre: perfil.nombre || null,
        enlace: this.enlaces.ingresoPorCorreo(token),
        minutos: MINUTOS_VIGENCIA,
      },
      // Cada enlace es un correo distinto: la clave es la del enlace, no la persona.
      { clave: `c14:${id}`, perfilId: perfil.id },
    );
  }

  /** Gasta el enlace y devuelve a quién deja entrar y a dónde vuelve. */
  async canjear(token: string): Promise<{ perfil: Perfil; retorno: string }> {
    const canje = await this.repo.canjear(hash(token));
    if (!canje) {
      throw new UnauthorizedException('El enlace venció o ya se usó. Pide uno nuevo.');
    }

    const perfil = await this.perfiles.porId(canje.perfilId);
    if (!perfil) throw new UnauthorizedException('El enlace ya no corresponde a nadie');
    if (perfil.estado === 'bloqueado') throw new ForbiddenException('Tu cuenta está bloqueada');

    await this.repo.marcarActivo(perfil.id);
    // Se valida de nuevo al salir: la regla de la base solo exige que empiece
    // con `/`, y una fila vieja o cargada a mano no pasó por el DTO.
    const retorno = RUTA_INTERNA.test(canje.retorno) ? canje.retorno : '/panel';
    return { perfil, retorno };
  }
}
