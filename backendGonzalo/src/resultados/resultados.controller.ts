import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Roles } from '../comun/autorizacion/roles.decorador.js';
import { UsuarioActual } from '../comun/autorizacion/usuario-actual.decorador.js';
import type { UsuarioSesion } from '../comun/autorizacion/usuario-sesion.js';
import { ResultadosService } from './resultados.service.js';

class PublicarDto {
  @ApiPropertyOptional({
    description: 'Publica aunque haya evaluaciones sin terminar. Es una decisión deliberada.',
  })
  @IsOptional()
  @IsBoolean()
  forzar?: boolean;
}

@ApiTags('Resultados')
@Controller()
export class ResultadosController {
  constructor(private readonly resultados: ResultadosService) {}

  @Get('mi-resultado')
  @ApiOperation({
    summary: 'Si el equipo de quien pregunta entró al podio',
    description:
      'Lo ÚNICO que el concursante sabe del final. No hay puntaje, ni posición fuera del ' +
      'podio, ni devolución: «no deben ver puntaje ni nota o tipo de valor». ' +
      'Mientras no se publique, `publicado` es false y no hay nada más que mostrar.',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        publicado: { type: 'boolean' },
        gano: { type: 'boolean' },
        posicion: { type: 'number', nullable: true, description: '1, 2 o 3. Null si no entró.' },
      },
    },
  })
  mio(@UsuarioActual() usuario: UsuarioSesion) {
    return this.resultados.mio(usuario.id);
  }

  @Roles('admin')
  @Get('admin/resultados')
  @ApiOperation({
    summary: 'El ranking completo, con puntajes y nombres',
    description: 'Interno: es lo que va al acta. Nunca se le muestra a un concursante.',
  })
  ranking() {
    return this.resultados.ranking();
  }

  @Roles('admin')
  @Post('admin/resultados/calcular')
  @ApiOperation({
    summary: 'Calcula y congela el ranking',
    description:
      'Promedio ponderado por criterio, promediado entre jurados. Descarta a los jurados ' +
      'que dejaron criterios sin completar. Se puede correr las veces que haga falta.',
  })
  calcular() {
    return this.resultados.calcular();
  }

  @Roles('admin')
  @Post('admin/resultados/publicar')
  @ApiOperation({
    summary: 'Publica el podio',
    description:
      'Escribe una fecha y nada más: no recalcula ni mueve puntajes. Se bloquea si hay ' +
      'evaluaciones sin terminar, salvo que se mande `forzar`.',
  })
  publicar(@Body() datos: PublicarDto) {
    return this.resultados.publicar(datos.forzar ?? false);
  }
}
