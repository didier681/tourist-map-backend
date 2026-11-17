import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';
import { Resena } from './resena.entity';
import { User } from '../../user/entities/user.entity';

export enum MotivoReporteResena {
  Ofensiva = 'ofensiva',
  Falsa = 'falsa',
  Spam = 'spam',
}

@Entity('reporte_resena')
@Index('UQ_reporte_resena_usuario', ['idResena', 'idUsuario'], {
  unique: true,
})
export class ReporteResena {
  @PrimaryGeneratedColumn({ name: 'id_reporte' })
  idReporte: number;

  @Column({ type: 'int', name: 'id_resena' })
  idResena: number;

  @ManyToOne(() => Resena, (resena) => resena.reportes, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_resena', referencedColumnName: 'idResena' })
  resena: Resena;

  @Column({ type: 'int', name: 'id_usuario' })
  idUsuario: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario', referencedColumnName: 'id' })
  usuario: User;

  @Column({ type: 'enum', enum: MotivoReporteResena })
  motivo: MotivoReporteResena;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha' })
  fecha: Date;
}
