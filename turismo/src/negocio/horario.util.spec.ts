import { estaAbiertoAhora } from './horario.util';

describe('horario local de negocios', () => {
  it('evalúa el día y la hora en America/Bogota', () => {
    const horario = [
      {
        diaSemana: 2,
        horaApertura: '09:00:00',
        horaCierre: '11:00:00',
      },
    ];
    expect(
      estaAbiertoAhora(horario, new Date('2026-11-17T15:00:00.000Z')),
    ).toBe(true);
    expect(
      estaAbiertoAhora(horario, new Date('2026-11-17T18:00:00.000Z')),
    ).toBe(false);
  });
});
