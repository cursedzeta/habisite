import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Entorno } from '../configuracion/entorno.js';

/*
 * Pregunta a Cloudflare si el token del widget es de una persona.
 *
 * Si Cloudflare responde que no, se rechaza. Si Cloudflare NO responde (caído,
 * timeout), se deja pasar y queda en el log: preferimos aceptar algún bot ese
 * rato antes que bloquear a todos los inscriptos del día de lanzamiento. El
 * límite por IP sigue funcionando igual en ese caso.
 */
@Injectable()
export class TurnstileService {
  private readonly log = new Logger(TurnstileService.name);

  constructor(private readonly config: ConfigService<Entorno, true>) {}

  async verificar(token: string, ip: string | null): Promise<void> {
    const cuerpo = new URLSearchParams({
      secret: this.config.get('TURNSTILE_SECRET', { infer: true }),
      response: token,
    });
    if (ip) cuerpo.set('remoteip', ip);

    let resultado: { success?: boolean; 'error-codes'?: string[] };
    try {
      const respuesta = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: cuerpo,
        signal: AbortSignal.timeout(8_000),
      });
      resultado = (await respuesta.json()) as typeof resultado;
    } catch (error) {
      this.log.warn(`Turnstile no respondió, se deja pasar: ${(error as Error).message}`);
      return;
    }

    if (!resultado.success) {
      this.log.log(`Turnstile rechazó un envío: ${(resultado['error-codes'] ?? []).join(', ')}`);
      throw new ForbiddenException('No pudimos verificar el envío. Probá de nuevo.');
    }
  }
}
