import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationType } from '@talent-net/types';

@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  /**
   * Null means this is a global default template.
   * Non-null means this is a role-specific override.
   */
  @Column({ type: 'uuid', nullable: true })
  jobId!: string | null;

  @Column({ type: 'varchar', length: 500 })
  subjectTemplate!: string;

  /**
   * Handlebars-style template body.
   * Available variables: {{candidateName}}, {{jobTitle}}, {{companyName}},
   * {{applicationStatus}}, {{interviewDate}}, {{interviewLink}}, etc.
   */
  @Column({ type: 'text' })
  bodyTemplate!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
