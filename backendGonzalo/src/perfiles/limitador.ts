import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

/** 20 envíos cada 15 minutos por IP. Alcanza para un curso entero detrás de la misma red. */
const LIMITE = 20;
const VENTANA_MS = 15 * 60 * 1000;

/*
 * Límite de envíos del formulario por IP, en memoria.
 *
 * Alcanza mientras la API corra en una sola copia, que es el caso. Si algún
 * día corre en varias, cada una cuenta por su lado (el límite efectivo se
 * multiplica), pero Turnstile sigue cortando a los bots igual.
 */
@Injectable()
export class LimitadorInscripcion {
  private readonly envios = new Map<string, number[]>();

  /** Cuenta el envío; si la IP se pasó del límite, responde 429. */
  exigir(ip: string | null): void {
    const clave = ip ?? 'desconocida';
    const ahora = Date.now();
    const recientes = (this.envios.get(clave) ?? []).filter((t) => ahora - t < VENTANA_MS);

    if (recientes.length >= LIMITE) {
      this.envios.set(clave, recientes);
      throw new HttpException(
        'Demasiados intentos. Esperá un minuto y probá de nuevo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recientes.push(ahora);
    this.envios.set(clave, recientes);

    // Sin esto el mapa crece para siempre con IPs que no vuelven.
    if (this.envios.size > 10_000) this.limpiar(ahora);
  }

  private limpiar(ahora: number): void {
    for (const [ip, tiempos] of this.envios) {
      if (tiempos.every((t) => ahora - t >= VENTANA_MS)) this.envios.delete(ip);
    }
  }
}
