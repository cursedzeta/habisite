import { SetMetadata } from '@nestjs/common';
import type { Rol } from './usuario-sesion.js';

export const CLAVE_ROLES = 'roles';

/**
 * Restringe una ruta o un controlador entero a estos roles.
 * Sin el decorador, la ruta queda abierta a cualquier sesión válida.
 *
 *   @Roles('jurado')
 *   @Get('propuestas')
 */
export const Roles = (...roles: Rol[]) => SetMetadata(CLAVE_ROLES, roles);
