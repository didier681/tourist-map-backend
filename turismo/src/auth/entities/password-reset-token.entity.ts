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

@Entity('password_reset_tokens')
@Index('IDX_password_reset_tokens_hash', ['tokenHash'], { unique: true })
export class PasswordResetToken {
  @PrimaryGeneratedColumn({ name: 'id_password_reset_token' })
  id: number;

  @Column({ type: 'int', name: 'id_usuario' })
  idUsuario: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario', referencedColumnName: 'id' })
  usuario: User;

  @Column({ type: 'char', length: 64, name: 'token_hash' })
  tokenHash: string;

  @Column({ type: 'datetime', name: 'expira_en' })
  expiraEn: Date;

  @Column({ type: 'boolean', default: false })
  usado: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha' })
  fecha: Date;
}
