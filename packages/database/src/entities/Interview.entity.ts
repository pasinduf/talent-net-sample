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
import { InterviewType, InterviewStatus, InterviewOutcome } from '@talent-net/types';
import type { Application } from './Application.entity';
import type { InterviewSchedule } from './InterviewSchedule.entity';
import type { InterviewParticipant } from './InterviewParticipant.entity';
import type { IntegritySignal } from './IntegritySignal.entity';

@Entity('interviews')
@Index(['applicationId'])
@Index(['status'])
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('Application', (app: Application) => app.interviews, { nullable: false })
  @JoinColumn({ name: 'applicationId' })
  application!: Application;

  @Column({ type: 'uuid' })
  applicationId!: string;

  @Column({ type: 'enum', enum: InterviewType })
  type!: InterviewType;

  @Column({ type: 'enum', enum: InterviewStatus, default: InterviewStatus.PENDING_INVITE })
  status!: InterviewStatus;

  @Column({ type: 'enum', enum: InterviewOutcome, default: InterviewOutcome.PENDING })
  outcome!: InterviewOutcome;

  /**
   * Round number — e.g. 1 for first interview, 2 for second, etc.
   */
  @Column({ type: 'int', default: 1 })
  round!: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  purpose!: string | null;

  @Column({ type: 'int', nullable: true })
  durationMinutes!: number | null;

  // ─── AI interview specifics ───────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  aiPromptThemes!: string[] | null;

  @Column({ type: 'text', nullable: true })
  aiTranscript!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  aiScoreBreakdown!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  aiKeyObservations!: string | null;

  @Column({ type: 'text', nullable: true })
  aiStrengths!: string | null;

  @Column({ type: 'text', nullable: true })
  aiConcerns!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  aiRecommendation!: string | null;

  // ─── Manual interview specifics ───────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  consolidatedSummary!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  scorecardResponses!: Record<string, unknown> | null;

  // ─── Completion tracking ─────────────────────────────────────────────────

  @Column({ type: 'timestamp', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  isAbandoned!: boolean;

  @Column({ type: 'boolean', default: false })
  hasIntegrityFlags!: boolean;

  // ─── Relations ────────────────────────────────────────────────────────────

  @OneToOne('InterviewSchedule', (is: InterviewSchedule) => is.interview, { cascade: true })
  schedule!: InterviewSchedule | null;

  @OneToMany('InterviewParticipant', (ip: InterviewParticipant) => ip.interview, {
    cascade: true,
  })
  participants!: InterviewParticipant[];

  @OneToMany('IntegritySignal', (sig: IntegritySignal) => sig.interview, { cascade: true })
  integritySignals!: IntegritySignal[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
