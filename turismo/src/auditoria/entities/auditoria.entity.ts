import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('auditoria')
@Index('IDX_auditoria_fecha', ['fecha'])
@Index('IDX_auditoria_usuario', ['idUsuario'])
export class Auditoria {
  @PrimaryGeneratedColumn({ name: 'id_auditoria' })
  idAuditoria: number;

  @Column({ type: 'int', name: 'id_usuario', nullable: true })
  idUsuario: number | null;

  @Column({ type: 'varchar', length: 100 })
  accion: string;

  @Column({ type: 'varchar', length: 100 })
  entidad: string;

  @Column({ type: 'int', name: 'id_entidad', nullable: true })
  idEntidad: number | null;

  @Column({ type: 'json', nullable: true })
  detalle: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha' })
  fecha: Date;
}
