import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import type { Application } from './Application.entity';

@Entity('candidate_scores')
export class CandidateScore {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne('Application', (app: Application) => app.score, { nullable: false })
  @JoinColumn({ name: 'applicationId' })
  application!: Application;

  @Column({ type: 'uuid' })
  applicationId!: string;

  @Column({ type: 'decimal', precision: 7, scale: 2, default: 0 })
  totalScore!: number;

  @Column({ type: 'decimal', precision: 7, scale: 2, default: 0 })
  preInterviewScore!: number;

  @Column({ type: 'decimal', precision: 7, scale: 2, default: 0 })
  postInterviewScore!: number;

  /**
   * AI confidence in this assessment (0–100).
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  confidenceLevel!: number;

  /**
   * JSON array of { dimensionId, dimensionName, rawScore, weightedScore, weight, phase }
   */
  @Column({ type: 'jsonb', nullable: true })
  dimensionScores!: Record<string, unknown>[] | null;

  /**
   * JSON array of { ruleId, ruleName, condition, action, isFlagged }
   */
  @Column({ type: 'jsonb', nullable: true })
  knockoutFlags!: Record<string, unknown>[] | null;

  // ─── AI-generated analysis ────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  aiSummary!: string | null;

  @Column({ type: 'text', nullable: true })
  strengthSummary!: string | null;

  @Column({ type: 'text', nullable: true })
  concernSummary!: string | null;

  @Column({ type: 'text', nullable: true })
  openQuestions!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  recommendation!: string | null;

  // ─── Provenance ───────────────────────────────────────────────────────────

  @Column({ type: 'boolean', default: false })
  isAiGenerated!: boolean;

  @Column({ type: 'boolean', default: false })
  isOverridden!: boolean;

  @Column({ type: 'text', nullable: true })
  overrideReason!: string | null;

  @Column({ type: 'uuid', nullable: true })
  overriddenByUserId!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  overriddenAt!: Date | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  scoredAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
