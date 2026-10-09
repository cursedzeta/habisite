import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Entorno } from '../configuracion/entorno.js';

/**
 * Las URLs que van adentro de los correos y de las respuestas, en un solo
 * lugar. Si cambia una ruta del front, se cambia acá y no en diez plantillas.
 */
@Injectable()
export class Enlaces {
  constructor(private readonly config: ConfigService<Entorno, true>) {}

  private get api(): string {
    return this.config.get('API_URL', { infer: true }).replace(/\/$/, '');
  }

  private get front(): string {
    return this.config.get('FRONTEND_URL', { infer: true }).replace(/\/$/, '');
  }

  /** Pasa por la API, que anota el clic y recién ahí redirige a WhatsApp. */
  grupo(tokenGrupo: string): string {
    return `${this.api}/r/${tokenGrupo}`;
  }

  /** Abre el formulario de la landing ya cargado con lo que la persona dejó. */
  completar(tokenCompletar: string): string {
    return `${this.front}/?completar=${tokenCompletar}#inscripcion`;
  }

  /** La pantalla del front que muestra «Ana te invitó a su equipo». */
  invitacion(token: string): string {
    return `${this.front}/invitacion/${token}`;
  }

  /** El enlace del equipo que el líder pega en el WhatsApp de su grupo. */
  sumarmeAlEquipo(token: string): string {
    return `${this.front}/equipo/sumarme/${token}`;
  }

  /**
   * El botón del correo al jurado (C7). Al panel y no directo a Google: sin
   * sesión, el panel le ofrece Google o un enlace por correo (docs/12), y no
   * queda trabado si su correo no es de Google.
   */
  ingreso(): string {
    return this.panel();
  }

  /** El enlace del correo de ingreso (docs/12). Lo canjea el front con un POST:
   *  si fuera un GET directo a la API, los antivirus de correo que abren los
   *  enlaces para revisarlos lo gastarían antes que la persona. */
  ingresoPorCorreo(token: string): string {
    return `${this.front}/ingresar?enlace=${token}`;
  }

  /** Una sola URL para los tres roles: el front muestra la vista según quién entró. */
  panel(): string {
    return `${this.front}/panel`;
  }

  landing(): string {
    return `${this.front}/`;
  }

  /** A dónde va /r/{token}. Sin grupo cargado todavía, a la landing. */
  destinoGrupo(): string {
    // `||` y no `??`: con la variable vacía en el .env, ConfigService devuelve
    // '' en vez de undefined, y '' ?? x se queda con el vacío.
    return this.config.get('WHATSAPP_URL', { infer: true }) || this.landing();
  }
}
