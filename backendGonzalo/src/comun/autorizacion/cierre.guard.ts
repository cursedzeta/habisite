import {
  type CanActivate,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BaseDeDatos } from '../base-de-datos/base-de-datos.service.js';

/*
 * Rechaza toda escritura sobre la propuesta pasado el cierre de entregas, más
 * los minutos de gracia. Se aplica por ruta: @UseGuards(CierreGuard).
 *
 * El cierre se decide acá, con el reloj del servidor y la fecha de `edicion`,
 * no en el botón del front. El front lo esconde *además*, no *en vez*.
 */
@Injectable()
export class CierreGuard implements CanActivate {
  constructor(private readonly db: BaseDeDatos) {}

  async canActivate(): Promise<boolean> {
    const { rows } = await this.db.consultar<{ abierto: boolean }>(`
      select coalesce(
               now() <= cierre_entregas
                        + make_interval(mins => coalesce(margen_gracia_minutos, 0)),
               true -- sin fecha de cierre cargada todavía: abierto
             ) as abierto
        from edicion
       where id = 1
    `);

    if (rows.length === 0) {
      throw new ServiceUnavailableException(
        'La edición del concurso no está configurada',
      );
    }
    if (!rows[0].abierto) {
      throw new HttpException('Las entregas están cerradas', HttpStatus.LOCKED);
    }
    return true;
  }
}
