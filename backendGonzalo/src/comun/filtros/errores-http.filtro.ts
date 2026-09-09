import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface CuerpoDeError {
  estado: number;
  mensaje: string;
  detalles?: string[];
  ruta: string;
  hora: string;
}

/*
 * Una sola forma de error para toda la API, en español. Los 500 van al log
 * con su stack; al cliente le llega un mensaje genérico, nunca el detalle.
 */
@Catch()
export class FiltroDeErrores implements ExceptionFilter {
  private readonly log = new Logger('Errores');

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const respuesta = http.getResponse<Response>();
    const peticion = http.getRequest<Request>();

    const { estado, mensaje, detalles } = this.interpretar(excepcion);

    if (estado >= 500) {
      const error =
        excepcion instanceof Error ? excepcion : new Error(String(excepcion));
      this.log.error(
        `${peticion.method} ${peticion.url} → ${estado}`,
        error.stack,
      );
    }

    const cuerpo: CuerpoDeError = {
      estado,
      mensaje,
      ...(detalles ? { detalles } : {}),
      ruta: peticion.url,
      hora: new Date().toISOString(),
    };
    respuesta.status(estado).json(cuerpo);
  }

  private interpretar(
    excepcion: unknown,
  ): Omit<CuerpoDeError, 'ruta' | 'hora'> {
    if (!(excepcion instanceof HttpException)) {
      return {
        estado: HttpStatus.INTERNAL_SERVER_ERROR,
        mensaje: 'Algo falló de nuestro lado',
      };
    }

    const estado = excepcion.getStatus();
    const cuerpo = excepcion.getResponse();
    if (typeof cuerpo === 'string') return { estado, mensaje: cuerpo };

    const { message } = cuerpo as { message?: string | string[] };

    // El ValidationPipe manda una lista: un renglón por campo inválido.
    if (Array.isArray(message)) {
      return {
        estado,
        mensaje: 'Los datos enviados no son válidos',
        detalles: message,
      };
    }
    return { estado, mensaje: message ?? excepcion.message };
  }
}
