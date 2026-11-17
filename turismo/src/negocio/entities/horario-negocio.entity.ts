import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Negocio } from './negocio.entity';

@Entity('horario_negocio')
@Index('IDX_horario_negocio_dia', ['idNegocio', 'diaSemana'])
export class HorarioNegocio {
  @PrimaryGeneratedColumn({ name: 'id_horario' })
  idHorario: number;

  @Column({ type: 'int', name: 'id_negocio' })
  idNegocio: number;

  @ManyToOne(() => Negocio, (negocio) => negocio.horarios, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_negocio', referencedColumnName: 'idNegocio' })
  negocio: Negocio;

  @Column({ type: 'tinyint', name: 'dia_semana' })
  diaSemana: number;

  @Column({ type: 'time', name: 'hora_apertura' })
  horaApertura: string;

  @Column({ type: 'time', name: 'hora_cierre' })
  horaCierre: string;
}
