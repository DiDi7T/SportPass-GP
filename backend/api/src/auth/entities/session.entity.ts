import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'refresh_token_hash', type: 'varchar', length: 64, unique: true }) refreshTokenHash!: string;
  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true }) userAgent!: string | null;
  @Column({ name: 'ip_address', type: 'inet', nullable: true }) ipAddress!: string | null;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true }) revokedAt!: Date | null;
  @ManyToOne(() => User, user => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) user!: Relation<User>;
}
