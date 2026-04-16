import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import {
  JobStatus,
  EmploymentType,
  ExperienceLevel,
  InterviewType,
} from '@talent-net/types';
import type { User } from './User.entity';
import type { ScoringConfig } from './ScoringConfig.entity';
import type { ApplicationForm } from './ApplicationForm.entity';
import type { Application } from './Application.entity';
import type { JobAssignment } from './JobAssignment.entity';
import type { TalentPool } from './TalentPool.entity';

@Entity('jobs')
@Index(['status'])
@Index(['department'])
@Index(['slug'], { unique: true })
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 300, unique: true })
  slug!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 100 })
  department!: string;

  @Column({ type: 'enum', enum: EmploymentType })
  employmentType!: EmploymentType;

  @Column({ type: 'enum', enum: ExperienceLevel })
  level!: ExperienceLevel;

  @Column({ type: 'varchar', length: 255 })
  location!: string;

  @Column({ type: 'boolean', default: false })
  isRemote!: boolean;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.DRAFT })
  status!: JobStatus;

  @Column({ type: 'simple-array', nullable: true })
  interviewTypes!: InterviewType[];

  @Column({ type: 'int', nullable: true })
  headcount!: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  salaryMin!: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  salaryMax!: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true, default: 'LKR' })
  salaryCurrency!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  applicationDeadline!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  closedAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  isExternallyPosted!: boolean;

  @Column({ type: 'simple-array', nullable: true })
  externalChannels!: string[] | null;

  // ─── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne('User', (user: User) => user.createdJobs, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ type: 'uuid' })
  createdById!: string;

  @OneToOne('ScoringConfig', (sc: ScoringConfig) => sc.job, { cascade: true, nullable: true })
  scoringConfig!: ScoringConfig | null;

  @OneToOne('ApplicationForm', (af: ApplicationForm) => af.job, { cascade: true, nullable: true })
  applicationForm!: ApplicationForm | null;

  @OneToMany('Application', (app: Application) => app.job)
  applications!: Application[];

  @OneToMany('JobAssignment', (ja: JobAssignment) => ja.job)
  assignments!: JobAssignment[];

  @OneToMany('TalentPool', (tp: TalentPool) => tp.sourceJob)
  talentPools!: TalentPool[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
