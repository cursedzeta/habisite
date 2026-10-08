import { randomBytes } from 'node:crypto';

/**
 * 32 bytes en base64url: imposible de adivinar por fuerza bruta, y seguro
 * para ir en una URL sin escapar nada.
 */
export const nuevoToken = (): string => randomBytes(32).toString('base64url');
