import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Publico } from '../comun/autorizacion/publico.decorador.js';

/**
 * Lo que Railway consulta para saber que el proceso está vivo.
 *
 * Público porque lo consulta sin cookie, y no toca la base a propósito: una
 * base caída no tiene que tumbar el deploy.
 */
@ApiTags('Salud')
@Controller('salud')
export class SaludController {
  @Publico()
  @Get()
  @ApiOperation({ summary: 'Health check' })
  estado() {
    return { estado: 'ok', hora: new Date().toISOString() };
  }
}
