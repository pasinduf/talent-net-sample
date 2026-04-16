import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AuditAction } from '@talent-net/types';
import type { User } from './User.entity';

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['actorId'])
@Index(['action'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: AuditAction })
  action!: AuditAction;

  /**
   * The type of entity the action was performed on.
   * e.g. "Job", "Application", "Interview", "Candidate"
   */
  @Column({ type: 'varchar', length: 100 })
  entityType!: string;

  @Column({ type: 'uuid', nullable: true })
  entityId!: string | null;

  /**
   * The job this audit event is associated with.
   * Null for actions not related to a specific job (e.g. user management).
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  jobId!: string | null;

  /**
   * The internal user who performed the action.
   * Null for system-automated actions.
   */
  @ManyToOne('User', (user: User) => user.auditLogs, { nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor!: User | null;

  @Column({ type: 'uuid', nullable: true })
  actorId!: string | null;

  /**
   * Snapshot of the entity state BEFORE the action.
   */
  @Column({ type: 'jsonb', nullable: true })
  previousState!: Record<string, unknown> | null;

  /**
   * Snapshot of the entity state AFTER the action.
   */
  @Column({ type: 'jsonb', nullable: true })
  newState!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
