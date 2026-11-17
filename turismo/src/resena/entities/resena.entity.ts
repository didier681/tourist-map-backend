import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Transform } from 'class-transformer';
import { User } from '../../user/entities/user.entity';
import { SitioTuristico } from '../../sitio-turistico/entities/sitio-turistico.entity';
import { Negocio } from '../../negocio/entities/negocio.entity';
import { ReporteResena } from './reporte-resena.entity';

export enum EstadoResena {
  Visible = 'visible',
  EnRevision = 'en_revision',
  Oculta = 'oculta',
}

// Opinión de un usuario sobre un sitio turístico o un negocio.
@Entity('resenas')
@Index(['idUsuario', 'idSitio'], { unique: true })
@Index(['idUsuario', 'idNegocio'], { unique: true })
export class Resena {
  @PrimaryGeneratedColumn({ name: 'id_resena' })
  idResena: number;

  @Column({ type: 'int', name: 'id_usuario', nullable: true })
  idUsuario: number | null;

  // Mantiene la calificación al eliminar la cuenta y sustituye los datos del autor por anonimato.
  @Transform(
    ({ value }: { value: User | null }) =>
      value
        ? { id: value.id, nombre: value.nombre }
        : { id: null, nombre: 'Usuario eliminado' },
    { toPlainOnly: true },
  )
  @ManyToOne(() => User, (usuario) => usuario.resenas, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'id_usuario', referencedColumnName: 'id' })
  usuario: User | null;

  @Column({ type: 'int', name: 'id_sitio', nullable: true })
  idSitio: number | null;

  // Cada reseña corresponde a un único destino; la otra clave queda nula.
  @ManyToOne(() => SitioTuristico, (sitio) => sitio.resenas, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_sitio', referencedColumnName: 'idSitio' })
  sitio: SitioTuristico | null;

  @Column({ type: 'int', name: 'id_negocio', nullable: true })
  idNegocio: number | null;

  @ManyToOne(() => Negocio, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_negocio', referencedColumnName: 'idNegocio' })
  negocio: Negocio | null;

  @Column({ type: 'int' })
  calificacion: number;

  @Column({ type: 'text' })
  comentario: string;

  @Column({
    type: 'enum',
    enum: EstadoResena,
    default: EstadoResena.Visible,
  })
  estado: EstadoResena;

  @OneToMany(() => ReporteResena, (reporte) => reporte.resena)
  reportes: ReporteResena[];
}
