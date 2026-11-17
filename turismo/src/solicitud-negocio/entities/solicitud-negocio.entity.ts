import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { CreateNegocioDto } from '../../negocio/dto/create-negocio.dto';

export enum EstadoSolicitudNegocio {
  Pendiente = 'pendiente',
  Aprobada = 'aprobada',
  Rechazada = 'rechazada',
}

@Entity('solicitudes_negocio')
@Index('IDX_solicitudes_usuario_estado', ['idUsuario', 'estado'])
export class SolicitudNegocio {
  @PrimaryGeneratedColumn({ name: 'id_solicitud' })
  idSolicitud: number;

  @Column({ type: 'int', name: 'id_usuario' })
  idUsuario: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario', referencedColumnName: 'id' })
  usuario: User;

  @Column({ type: 'json', name: 'datos_negocio' })
  datosNegocio: CreateNegocioDto;

  @Column({ type: 'varchar', length: 2048, name: 'soporte_url', nullable: true })
  soporteUrl: string | null;

  @Column({
    type: 'enum',
    enum: EstadoSolicitudNegocio,
    default: EstadoSolicitudNegocio.Pendiente,
  })
  estado: EstadoSolicitudNegocio;

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha_solicitud' })
  fechaSolicitud: Date;
}
