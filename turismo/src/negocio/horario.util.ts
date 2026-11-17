import { HorarioNegocio } from './entities/horario-negocio.entity';

// Interpreta el instante en la zona horaria del departamento, no en la del host.
export function estaAbiertoAhora(
  horarios: Pick<HorarioNegocio, 'diaSemana' | 'horaApertura' | 'horaCierre'>[],
  instante = new Date(),
): boolean {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instante);
  const dias: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = partes.find(({ type }) => type === 'weekday')?.value ?? 'Sun';
  const hour = partes.find(({ type }) => type === 'hour')?.value ?? '00';
  const minute = partes.find(({ type }) => type === 'minute')?.value ?? '00';
  const day = dias[weekday];
  const time = `${hour}:${minute}`;
  return horarios.some(
    (horario) =>
      horario.diaSemana === day &&
      horario.horaApertura.slice(0, 5) <= time &&
      horario.horaCierre.slice(0, 5) > time,
  );
}
