import { BadRequestException, Injectable, PayloadTooLargeException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';

export interface ArchivoValidado {
  contenido: Buffer;
  sha256: Buffer;
  bytes: number;
  paginas: number;
}

/*
 * Todo lo que hay que comprobar antes de guardar un PDF.
 *
 * Nada de esto se puede delegar al navegador: la validación del cliente se
 * saltea con una petición directa a la API.
 */
@Injectable()
export class ArchivoService {
  async validar(
    rutaTemporal: string,
    tamanoDeclarado: number,
    maxBytes: number,
    maxPaginas: number | null,
  ): Promise<ArchivoValidado> {
    try {
      if (tamanoDeclarado > maxBytes) {
        throw new PayloadTooLargeException(
          `El PDF pesa ${this.enMb(tamanoDeclarado)} MB y el tope es ${this.enMb(maxBytes)} MB`,
        );
      }

      const contenido = await readFile(rutaTemporal);

      // El tamaño real, no el que declaró el cliente.
      if (contenido.byteLength > maxBytes) {
        throw new PayloadTooLargeException(
          `El PDF pesa ${this.enMb(contenido.byteLength)} MB y el tope es ${this.enMb(maxBytes)} MB`,
        );
      }

      // Los bytes mágicos. La extensión y el Content-Type los escribe el
      // cliente: no son evidencia de nada.
      if (contenido.subarray(0, 5).toString('latin1') !== '%PDF-') {
        throw new BadRequestException('El archivo no es un PDF');
      }

      const paginas = await this.contarPaginas(contenido);

      if (maxPaginas !== null && paginas > maxPaginas) {
        throw new BadRequestException(
          `El PDF tiene ${paginas} páginas y el máximo son ${maxPaginas}`,
        );
      }

      return {
        contenido,
        // Sirve para probar que el archivo evaluado es el mismo que se entregó,
        // si alguien reclama.
        sha256: createHash('sha256').update(contenido).digest(),
        bytes: contenido.byteLength,
        paginas,
      };
    } finally {
      await unlink(rutaTemporal).catch(() => undefined);
    }
  }

  private async contarPaginas(contenido: Buffer): Promise<number> {
    try {
      const pdf = await PDFDocument.load(contenido, { ignoreEncryption: false });
      return pdf.getPageCount();
    } catch (error) {
      const detalle = error instanceof Error ? error.message : '';
      // Un PDF con contraseña se abre pero el jurado no lo puede leer, y nadie
      // entendería por qué. Mejor rechazarlo en la carga.
      if (/encrypt/i.test(detalle)) {
        throw new BadRequestException(
          'El PDF está protegido con contraseña. Subilo sin protección.',
        );
      }
      throw new BadRequestException('El PDF está dañado o no se puede leer');
    }
  }

  private enMb(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(1);
  }
}
