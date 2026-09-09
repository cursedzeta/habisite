import { Global, Module } from '@nestjs/common';
import { BaseDeDatos } from './base-de-datos.service.js';

// Global a propósito: la base es infraestructura transversal y cada módulo
// de negocio la necesita. Importarla en cada uno sería ruido sin beneficio.
@Global()
@Module({
  providers: [BaseDeDatos],
  exports: [BaseDeDatos],
})
export class BaseDeDatosModule {}
