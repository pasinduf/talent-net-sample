import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserRole } from '@talent-net/types';
import type { Job } from './Job.entity';
import type { User } from './User.entity';

@Entity('job_assignments')
@Index(['jobId', 'userId'], { unique: true })
export class JobAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('Job', (job: Job) => job.assignments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'jobId' })
  job!: Job;

  @Column({ type: 'uuid' })
  jobId!: string;

  @ManyToOne('User', (user: User) => user.jobAssignments, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'enum', enum: UserRole })
  assignedRole!: UserRole;

  @Column({ type: 'uuid', nullable: true })
  assignedByUserId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
