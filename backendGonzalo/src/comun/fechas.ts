/**
 * Una fecha como la lee una persona, en la zona horaria del concurso:
 * «15 de octubre de 2026 a las 23:59 (hora estándar de Argentina)».
 *
 * Va en los comprobantes de entrega: tiene que coincidir con lo que dicen las
 * bases, no con el reloj de la computadora de quien lo lee.
 */
export function fechaLegible(fecha: Date, zonaHoraria: string): string {
  const texto = new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'long',
    timeStyle: 'short',
    hourCycle: 'h23',
    timeZone: zonaHoraria,
  }).format(fecha);
  const zona =
    new Intl.DateTimeFormat('es-AR', { timeZone: zonaHoraria, timeZoneName: 'longGeneric' })
      .formatToParts(fecha)
      .find((p) => p.type === 'timeZoneName')?.value ?? zonaHoraria;
  return `${texto} (${zona})`;
}
