import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { QuestionType } from '@talent-net/types';
import type { ApplicationForm } from './ApplicationForm.entity';
import type { ApplicationAnswer } from './ApplicationAnswer.entity';

@Entity('screening_questions')
export class ScreeningQuestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('ApplicationForm', (af: ApplicationForm) => af.screeningQuestions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'applicationFormId' })
  applicationForm!: ApplicationForm;

  @Column({ type: 'uuid' })
  applicationFormId!: string;

  @Column({ type: 'text' })
  question!: string;

  @Column({ type: 'enum', enum: QuestionType, default: QuestionType.TEXT })
  type!: QuestionType;

  @Column({ type: 'boolean', default: false })
  isRequired!: boolean;

  /**
   * When true, a "wrong" answer to this question triggers a knockout rule evaluation.
   */
  @Column({ type: 'boolean', default: false })
  isKnockout!: boolean;

  /**
   * For choice-based questions: the list of selectable options.
   */
  @Column({ type: 'jsonb', nullable: true })
  options!: string[] | null;

  /**
   * The "correct" option value(s) used for knockout evaluation.
   */
  @Column({ type: 'jsonb', nullable: true })
  knockoutAnswers!: string[] | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  helpText!: string | null;

  @Column({ type: 'int', default: 0 })
  order!: number;

  @OneToMany('ApplicationAnswer', (aa: ApplicationAnswer) => aa.screeningQuestion)
  answers!: ApplicationAnswer[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
