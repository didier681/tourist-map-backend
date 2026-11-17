import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('refresh_tokens')
@Index('IDX_refresh_tokens_token_hash', ['tokenHash'], { unique: true })
@Index('IDX_refresh_tokens_user_revoked', ['idUsuario', 'revocado'])
export class RefreshToken {
  @PrimaryGeneratedColumn({ name: 'id_refresh_token' })
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
  revocado: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha' })
  fecha: Date;
}
