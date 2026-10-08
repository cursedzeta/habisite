import type { Request } from 'express';

/**
 * La IP real de quien hace la petición.
 *
 * En producción la API queda detrás de Cloudflare y del proxy de Railway, así
 * que `request.ip` sería la IP de Cloudflare. Cloudflare manda la del cliente
 * en `CF-Connecting-IP`. Sin Cloudflare (en local, o si alguien le pega al
 * dominio de Railway directo) se usa la que resuelve Express con
 * `trust proxy`, que en ese caso es la correcta.
 *
 * Sirve para el límite de envíos del formulario y para registrar desde dónde
 * se aceptaron las bases. No es una prueba de identidad: un pedido que no pase
 * por Cloudflare puede inventar la cabecera. Por eso el formulario además
 * lleva Turnstile.
 */
export function ipDelCliente(peticion: Request): string | null {
  const deCloudflare = peticion.headers['cf-connecting-ip'];
  if (typeof deCloudflare === 'string' && deCloudflare.length > 0) return deCloudflare;
  return peticion.ip ?? null;
}
