import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Entorno } from '../configuracion/entorno.js';
import { CorreoRepository, type Envio } from './correo.repository.js';
import { armarCorreo, type CodigoCorreo, type DatosPorCodigo } from './plantillas.js';

/** Resend admite 2 envíos por segundo por defecto. Con 600 ms quedamos abajo. */
const ESPERA_ENTRE_ENVIOS_MS = 600;

/*
 * Todos los correos de la plataforma salen por acá. El resto del código no
 * habla con Resend: dice qué correo, a quién y con qué datos.
 *
 * Tres reglas (docs/10-correos.md):
 *
 *   1. Ningún correo frena la acción que lo dispara. `encolar` anota el envío
 *      en la base y vuelve; el correo sale después, desde la cola. Si Resend
 *      falla, la inscripción o la entrega ya quedaron guardadas igual.
 *   2. El mismo correo nunca sale dos veces: cada uno lleva una clave única,
 *      que además viaja a Resend como Idempotency-Key.
 *   3. Lo que no salió queda en `envios` y lo reintenta la tarea periódica.
 *
 * La cola vive en memoria y despacha de a uno, para no pasarse del límite de
 * Resend el día que se publiquen los resultados y salgan cientos juntos. Si el
 * proceso se cae con correos en la cola, quedan en `pendiente` en la base y
 * la tarea periódica los vuelve a meter.
 */
@Injectable()
export class CorreoService implements OnModuleDestroy {
  private readonly log = new Logger(CorreoService.name);
  private readonly cola: string[] = [];
  private despachando = false;
  private apagando = false;

  constructor(
    private readonly repo: CorreoRepository,
    private readonly config: ConfigService<Entorno, true>,
  ) {}

  /**
   * Anota el correo y lo pone en la cola. Vuelve en cuanto quedó anotado.
   *
   * @param clave identifica ESTE envío: si ya existe uno con la misma clave,
   *              no se manda de nuevo. Ej. `c1:{perfilId}`.
   */
  async encolar<C extends CodigoCorreo>(
    codigo: C,
    destinatario: string,
    datos: DatosPorCodigo[C],
    opciones: { clave: string; perfilId?: string | null },
  ): Promise<void> {
    try {
      const id = await this.repo.anotar(
        codigo,
        destinatario,
        opciones.clave,
        datos,
        opciones.perfilId ?? null,
      );
      if (id) this.meterEnCola(id);
    } catch (error) {
      // Ni siquiera anotarlo puede romper la acción que lo disparó.
      this.log.error(`No se pudo anotar el correo ${opciones.clave}`, (error as Error).stack);
    }
  }

  /** Vuelve a meter en la cola lo que quedó sin salir. Lo llama la tarea periódica. */
  async reintentarRezagados(): Promise<number> {
    const ids = await this.repo.rezagados();
    ids.forEach((id) => this.meterEnCola(id));
    return ids.length;
  }

  onModuleDestroy(): void {
    // Lo que quede en la cola sigue en `pendiente`: lo retoma el próximo arranque.
    this.apagando = true;
  }

  // ── la cola ───────────────────────────────────────────────────────

  private meterEnCola(id: string): void {
    if (!this.cola.includes(id)) this.cola.push(id);
    void this.despachar();
  }

  private async despachar(): Promise<void> {
    if (this.despachando) return;
    this.despachando = true;
    try {
      while (this.cola.length > 0 && !this.apagando) {
        const id = this.cola.shift()!;
        const envio = await this.repo.tomar(id).catch(() => null);
        if (!envio) continue; // ya salió, o agotó los intentos

        const llamoAResend = await this.mandar(envio);
        if (llamoAResend) await esperar(ESPERA_ENTRE_ENVIOS_MS);
      }
    } finally {
      this.despachando = false;
    }
  }

  /** Devuelve si llegó a llamar a Resend (para saber si hay que esperar). */
  private async mandar(envio: Envio): Promise<boolean> {
    const clave = this.config.get('RESEND_API_KEY', { infer: true });

    let correo;
    try {
      correo = armarCorreo(envio.codigo, envio.datos as never);
    } catch (error) {
      await this.repo.marcarFallido(envio.id, `No se pudo armar la plantilla: ${(error as Error).message}`);
      return false;
    }

    // Sin clave (local, pruebas) no sale nada: queda anotado y al log.
    if (!clave) {
      this.log.log(`[sin envío] ${envio.codigo} → ${envio.destinatario} · «${correo.asunto}»`);
      await this.repo.marcarOmitido(envio.id);
      return false;
    }

    try {
      const respuesta = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clave}`,
          'Content-Type': 'application/json',
          // Si un reintento llega después de que el primero sí salió, Resend
          // lo reconoce y no lo manda de nuevo.
          'Idempotency-Key': envio.clave,
        },
        body: JSON.stringify({
          from: this.config.get('CORREO_REMITENTE', { infer: true }),
          to: [envio.destinatario],
          // Sin casilla de respuesta configurada, no se manda el campo.
          reply_to: this.config.get('CORREO_RESPONDER_A', { infer: true }) || undefined,
          subject: correo.asunto,
          html: correo.html,
          text: correo.texto,
          tags: [{ name: 'correo', value: envio.codigo }],
        }),
        signal: AbortSignal.timeout(15_000),
      });

      const cuerpo = (await respuesta.json().catch(() => null)) as { id?: string; message?: string } | null;
      if (!respuesta.ok) {
        const motivo = `${respuesta.status} ${cuerpo?.message ?? respuesta.statusText}`;
        this.log.warn(`Resend rechazó ${envio.clave} (intento ${envio.intentos}): ${motivo}`);
        await this.repo.marcarFallido(envio.id, motivo);
        return true;
      }

      await this.repo.marcarEnviado(envio.id, cuerpo?.id ?? null);
      return true;
    } catch (error) {
      this.log.warn(`No se pudo hablar con Resend para ${envio.clave}: ${(error as Error).message}`);
      await this.repo.marcarFallido(envio.id, (error as Error).message);
      return true;
    }
  }
}

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));
