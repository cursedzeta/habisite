import type { Request } from 'express';

export type Rol = 'participante' | 'jurado' | 'admin';

/**
 * Quién está haciendo la petición, una vez resuelta la sesión.
 * La cookie lleva solo el id; el rol se lee de `perfiles` en cada request,
 * nunca viaja desde el cliente.
 */
export interface UsuarioSesion {
  id: string;
  rol: Rol;
}

/** El request de Express con el usuario que le colgó el guard de sesión. */
export type RequestConUsuario = Request & { usuario?: UsuarioSesion };
