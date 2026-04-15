import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { UserRole } from '@talent-net/types';
import type { Job } from './Job.entity';
import type { InternalNote } from './InternalNote.entity';
import type { AuditLog } from './AuditLog.entity';
import type { JobAssignment } from './JobAssignment.entity';
import type { InterviewParticipant } from './InterviewParticipant.entity';

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.HR_ADMIN })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl!: string | null;

  @OneToMany('Job', (job: Job) => job.createdBy)
  createdJobs!: Job[];

  @OneToMany('InternalNote', (note: InternalNote) => note.author)
  notes!: InternalNote[];

  @OneToMany('AuditLog', (log: AuditLog) => log.actor)
  auditLogs!: AuditLog[];

  @OneToMany('JobAssignment', (ja: JobAssignment) => ja.user)
  jobAssignments!: JobAssignment[];

  @OneToMany('InterviewParticipant', (ip: InterviewParticipant) => ip.user)
  interviewParticipations!: InterviewParticipant[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
