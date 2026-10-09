import { BlockList, isIP } from 'node:net';
import type { Request } from 'express';

/*
 * Los rangos de Cloudflare, de https://www.cloudflare.com/ips/ (cambian muy
 * de vez en cuando; si cambian, se actualizan acá).
 */
const CLOUDFLARE_V4 = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
  '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
  '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
  '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
];
const CLOUDFLARE_V6 = [
  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32',
  '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32',
];

/**
 * Quién puede decirnos la IP del cliente: Cloudflare, y la misma máquina. Lo
 * segundo es para el entorno local y las pruebas (`pruebas/`), que simulan
 * Cloudflare mandando la cabecera; en Railway ningún pedido llega desde
 * loopback.
 */
const CONFIABLES = new BlockList();
for (const red of CLOUDFLARE_V4) {
  const [direccion, prefijo] = red.split('/');
  CONFIABLES.addSubnet(direccion, Number(prefijo), 'ipv4');
}
for (const red of CLOUDFLARE_V6) {
  const [direccion, prefijo] = red.split('/');
  CONFIABLES.addSubnet(direccion, Number(prefijo), 'ipv6');
}
CONFIABLES.addSubnet('127.0.0.0', 8, 'ipv4');
CONFIABLES.addAddress('::1', 'ipv6');

/** `::ffff:1.2.3.4` → `1.2.3.4`: así da Node las IPv4 en un socket dual. */
const normalizar = (ip: string) => (ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip);

function esConfiable(ip: string): boolean {
  const tipo = isIP(ip);
  if (tipo === 0) return false;
  return CONFIABLES.check(ip, tipo === 4 ? 'ipv4' : 'ipv6');
}

/**
 * La IP real de quien hace la petición.
 *
 * `request.ip` es la que resuelve Express con `trust proxy` (el proxy de
 * Railway). Hoy `api.challenge` va con la nube gris (CLAUDE.md §4): no pasa
 * por Cloudflare, `request.ip` ya es la del cliente, y una cabecera
 * `CF-Connecting-IP` la puede inventar cualquiera para esquivar el límite por
 * IP. Por eso la cabecera solo vale cuando el pedido llega desde una IP de
 * Cloudflare: si algún día se pasa a naranja, empieza a usarse sola y el
 * límite no trata a todos los visitantes como si fueran Cloudflare.
 *
 * Sirve para el límite de envíos del formulario y del enlace de ingreso, y
 * para registrar desde dónde se aceptaron las bases.
 */
export function ipDelCliente(peticion: Request): string | null {
  const directa = peticion.ip ? normalizar(peticion.ip) : null;
  const deCloudflare = peticion.headers['cf-connecting-ip'];
  // Y solo si es una IP: lo que no lo sea rompe el insert en las columnas
  // `inet` con un 500, que en POST /auth/enlace delataría quién se anotó.
  if (directa && esConfiable(directa) && typeof deCloudflare === 'string' && isIP(deCloudflare) !== 0) {
    return deCloudflare;
  }
  return directa;
}
