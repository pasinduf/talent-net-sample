import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DimensionType, EvaluationPhase } from '@talent-net/types';
import type { ScoringConfig } from './ScoringConfig.entity';

@Entity('evaluation_dimensions')
export class EvaluationDimension {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('ScoringConfig', (sc: ScoringConfig) => sc.evaluationDimensions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scoringConfigId' })
  scoringConfig!: ScoringConfig;

  @Column({ type: 'uuid' })
  scoringConfigId!: string;

  /**
   * Human-readable label for this dimension.
   * e.g. "Experience Relevance", "Skill Match", "Communication Quality"
   */
  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * Percentage contribution of this dimension to the phase total (0–100).
   * All dimensions within the same phase should sum to 100.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  weight!: number;

  /**
   * Governs whether this dimension is required, advisory, or disqualifying.
   */
  @Column({ type: 'enum', enum: DimensionType, default: DimensionType.MANDATORY })
  type!: DimensionType;

  /**
   * Which evaluation phase this dimension applies to.
   */
  @Column({ type: 'enum', enum: EvaluationPhase, default: EvaluationPhase.PRE_INTERVIEW })
  phase!: EvaluationPhase;

  /**
   * If set, a candidate scoring below this threshold on this dimension alone
   * triggers a manual review flag.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  minimumThreshold!: number | null;

  /**
   * When false, only authorized HR/senior reviewers can see this dimension's score.
   */
  @Column({ type: 'boolean', default: true })
  isVisibleToAllReviewers!: boolean;

  /**
   * Display order within the scoring configuration UI.
   */
  @Column({ type: 'int', default: 0 })
  order!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
