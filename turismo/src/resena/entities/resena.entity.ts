import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Transform } from 'class-transformer';
import { User } from '../../user/entities/user.entity';
import { SitioTuristico } from '../../sitio-turistico/entities/sitio-turistico.entity';

// Opinión de un usuario sobre un sitio turístico.
@Entity('resenas')
@Index(['idUsuario', 'idSitio'], { unique: true })
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

  @Column({ type: 'int', name: 'id_sitio' })
  idSitio: number;

  // Sitio al que corresponden la calificación y el comentario.
  @ManyToOne(() => SitioTuristico, (sitio) => sitio.resenas, {
    nullable: false,
  })
  @JoinColumn({ name: 'id_sitio', referencedColumnName: 'idSitio' })
  sitio: SitioTuristico;

  @Column({ type: 'int' })
  calificacion: number;

  @Column({ type: 'text' })
  comentario: string;
}
