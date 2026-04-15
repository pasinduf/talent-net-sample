import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { Job } from './Job.entity';
import type { EvaluationDimension } from './EvaluationDimension.entity';
import type { KnockoutRule } from './KnockoutRule.entity';

@Entity('scoring_configs')
export class ScoringConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne('Job', (job: Job) => job.scoringConfig, { nullable: false })
  @JoinColumn({ name: 'jobId' })
  job!: Job;

  @Column({ type: 'uuid' })
  jobId!: string;

  /**
   * Maximum possible total score (e.g. 100). All dimension weights must
   * sum to 100 — they represent percentages of this maximum.
   */
  @Column({ type: 'int', default: 100 })
  totalScaleMax!: number;

  /**
   * Percentage of the total score contributed by pre-interview dimensions.
   * preInterviewWeight + postInterviewWeight must equal 100.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 60 })
  preInterviewWeight!: number;

  /**
   * Percentage of the total score contributed by post-interview dimensions.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 40 })
  postInterviewWeight!: number;

  /**
   * Score at or above which a candidate is auto-moved to shortlisted.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 75 })
  shortlistThreshold!: number;

  /**
   * Score at or above which a candidate is considered passing.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 60 })
  passThreshold!: number;

  /**
   * Score below this requires manual human review before further action.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 40 })
  manualReviewThreshold!: number;

  /**
   * When true this config can be used as a template for future roles.
   */
  @Column({ type: 'boolean', default: false })
  isTemplate!: boolean;

  @Column({ type: 'varchar', length: 200, nullable: true })
  templateName!: string | null;

  // ─── Relations ──────────────────────────────────────────────────────────────

  @OneToMany('EvaluationDimension', (ed: EvaluationDimension) => ed.scoringConfig, {
    cascade: true,
    eager: true,
  })
  evaluationDimensions!: EvaluationDimension[];

  @OneToMany('KnockoutRule', (kr: KnockoutRule) => kr.scoringConfig, {
    cascade: true,
    eager: true,
  })
  knockoutRules!: KnockoutRule[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // ─── Computed helpers ────────────────────────────────────────────────────────

  get totalWeightUsed(): number {
    if (!this.evaluationDimensions) return 0;
    return this.evaluationDimensions.reduce((sum, d) => sum + Number(d.weight), 0);
  }

  get isWeightBalanced(): boolean {
    return Math.abs(this.totalWeightUsed - 100) < 0.01;
  }
}
