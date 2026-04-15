import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApplicationStatus } from '@talent-net/types';
import type { Job } from './Job.entity';
import type { Candidate } from './Candidate.entity';
import type { ApplicationAnswer } from './ApplicationAnswer.entity';
import type { Interview } from './Interview.entity';
import type { CandidateScore } from './CandidateScore.entity';
import type { InternalNote } from './InternalNote.entity';

@Entity('applications')
@Index(['jobId', 'candidateId'], { unique: true })
@Index(['status'])
@Index(['jobId'])
@Index(['candidateId'])
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('Job', (job: Job) => job.applications, { nullable: false })
  @JoinColumn({ name: 'jobId' })
  job!: Job;

  @Column({ type: 'uuid' })
  jobId!: string;

  @ManyToOne('Candidate', (c: Candidate) => c.applications, { nullable: false })
  @JoinColumn({ name: 'candidateId' })
  candidate!: Candidate;

  @Column({ type: 'uuid' })
  candidateId!: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.APPLIED,
  })
  status!: ApplicationStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt!: Date;

  // ─── CV / media snapshot at time of application ──────────────────────────

  @Column({ type: 'varchar', length: 1000, nullable: true })
  resumeS3Key!: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  introMediaS3Key!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverLetterS3Key!: string | null;

  // ─── Application source ───────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'careers_portal' })
  source!: string | null;

  // ─── Duplicate detection ──────────────────────────────────────────────────

  @Column({ type: 'boolean', default: false })
  isPossibleDuplicate!: boolean;

  @Column({ type: 'uuid', nullable: true })
  duplicateOfApplicationId!: string | null;

  // ─── Pipeline tracking ────────────────────────────────────────────────────

  @Column({ type: 'timestamp', nullable: true })
  shortlistedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({ type: 'boolean', default: false })
  hasKnockoutFlags!: boolean;

  @Column({ type: 'int', default: 0 })
  manualPriority!: number;

  // ─── Relations ────────────────────────────────────────────────────────────

  @OneToMany('ApplicationAnswer', (aa: ApplicationAnswer) => aa.application, { cascade: true })
  answers!: ApplicationAnswer[];

  @OneToMany('Interview', (iv: Interview) => iv.application)
  interviews!: Interview[];

  @OneToOne('CandidateScore', (cs: CandidateScore) => cs.application, { cascade: true })
  score!: CandidateScore | null;

  @OneToMany('InternalNote', (note: InternalNote) => note.application)
  notes!: InternalNote[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
