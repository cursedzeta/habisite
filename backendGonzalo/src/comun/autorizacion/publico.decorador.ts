import { SetMetadata } from '@nestjs/common';

export const CLAVE_PUBLICO = 'publico';

/**
 * Deja pasar sin sesión. Solo para lo que tiene que ser accesible sin haber
 * entrado: el arranque del login, la vuelta de Google y el health check.
 *
 * Todo lo demás exige sesión por defecto — es más seguro olvidarse de abrir
 * algo que olvidarse de cerrarlo.
 */
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);
