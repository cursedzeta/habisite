import { Global, Module } from '@nestjs/common';
import { CorreoRepository } from './correo.repository.js';
import { CorreoService } from './correo.service.js';
import { Enlaces } from './enlaces.js';

/**
 * Global, como la base de datos: casi todos los módulos mandan algún correo
 * (inscripción, equipos, propuestas, resultados) y una sola instancia
 * garantiza una sola cola, que es lo que respeta el límite de Resend.
 */
@Global()
@Module({
  providers: [CorreoService, CorreoRepository, Enlaces],
  exports: [CorreoService, Enlaces],
})
export class CorreoModule {}
