import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { NotificationType, NotificationChannel } from '@talent-net/types';

@Entity('notifications')
@Index(['recipientEmail'])
@Index(['candidateId'])
@Index(['applicationId'])
@Index(['sentAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({ type: 'enum', enum: NotificationChannel, default: NotificationChannel.EMAIL })
  channel!: NotificationChannel;

  @Column({ type: 'varchar', length: 255 })
  recipientEmail!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  subject!: string | null;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'uuid', nullable: true })
  candidateId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  applicationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  jobId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  templateId!: string | null;

  @Column({ type: 'boolean', default: false })
  isSent!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  sentAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  failureReason!: string | null;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
