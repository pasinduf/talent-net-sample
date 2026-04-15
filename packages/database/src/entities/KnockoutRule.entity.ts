import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { KnockoutCondition, KnockoutAction } from '@talent-net/types';
import type { ScoringConfig } from './ScoringConfig.entity';

@Entity('knockout_rules')
export class KnockoutRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('ScoringConfig', (sc: ScoringConfig) => sc.knockoutRules, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scoringConfigId' })
  scoringConfig!: ScoringConfig;

  @Column({ type: 'uuid' })
  scoringConfigId!: string;

  /**
   * Short label for the rule.
   * e.g. "Must have valid work authorization", "AWS Certification required"
   */
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * The type of mandatory condition being evaluated.
   */
  @Column({ type: 'enum', enum: KnockoutCondition })
  condition!: KnockoutCondition;

  /**
   * The expected value for this condition.
   * e.g. "yes" for work_authorization, "AWS Solutions Architect" for certification,
   * "5" for minimum_experience_years.
   */
  @Column({ type: 'varchar', length: 500 })
  conditionValue!: string;

  /**
   * What happens when the rule is triggered.
   * - rejection_review: flags for HR review before rejection
   * - non_progression: blocks further pipeline advancement
   * - manual_review_required: escalates to human decision
   */
  @Column({ type: 'enum', enum: KnockoutAction, default: KnockoutAction.REJECTION_REVIEW })
  action!: KnockoutAction;

  /**
   * The message shown internally when this rule is triggered.
   */
  @Column({ type: 'text' })
  errorMessage!: string;

  /**
   * Whether this rule is currently active. Inactive rules are evaluated
   * but don't block progression — useful for soft enforcement during tuning.
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
