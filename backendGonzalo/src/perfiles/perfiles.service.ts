import { ConflictException, Injectable } from '@nestjs/common';
import { EdicionRepository } from '../edicion/edicion.repository.js';
import type { InscripcionDto } from './dto/inscripcion.dto.js';
import type { YoDto } from './dto/yo.dto.js';
import type { Perfil } from './perfil.entity.js';
import { PerfilesRepository } from './perfiles.repository.js';

@Injectable()
export class PerfilesService {
  constructor(
    private readonly perfiles: PerfilesRepository,
    private readonly edicion: EdicionRepository,
  ) {}

  /**
   * Alta desde el formulario. Habilita en el acto, sin aprobación manual: con
   * muchos inscriptos, aprobar uno por uno sería un cuello de botella el día
   * que abre la convocatoria. El control queda en poder bloquear después.
   */
  async inscribir(datos: InscripcionDto): Promise<Perfil> {
    const existente = await this.perfiles.porCorreo(datos.correo);

    if (existente) {
      // Puede ser alguien que ya fue invitado a un equipo: existe la fila pero
      // sin datos personales. En ese caso la inscripción los completa.
      if (existente.googleSub || existente.nombre !== '') {
        throw new ConflictException('Ese correo ya está inscripto');
      }
    }
    return this.perfiles.inscribir(datos);
  }

  /** Lo que devuelve `GET /yo`, con el estado del concurso incluido. */
  async yo(perfilId: string): Promise<YoDto> {
    const [perfil, edicion] = await Promise.all([
      this.perfiles.porId(perfilId),
      this.edicion.obtener(),
    ]);

    return {
      id: perfil!.id,
      correo: perfil!.correo,
      nombre: perfil!.nombre,
      apellido: perfil!.apellido,
      institucion: perfil!.institucion,
      pais: perfil!.pais,
      rol: perfil!.rol,
      edicion: {
        estado: edicion.estado,
        cierreEntregas: edicion.cierreEntregas?.toISOString() ?? null,
        margenGraciaMinutos: edicion.margenGraciaMinutos,
        entregasAbiertas: edicion.entregasAbiertas,
        maxBytes: edicion.maxBytes,
        maxIntegrantes: edicion.maxIntegrantes,
        maxPaginas: edicion.maxPaginas,
        zonaHoraria: edicion.zonaHoraria,
      },
    };
  }
}
