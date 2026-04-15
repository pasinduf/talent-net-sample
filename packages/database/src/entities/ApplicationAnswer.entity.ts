import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Application } from './Application.entity';
import type { ScreeningQuestion } from './ScreeningQuestion.entity';

@Entity('application_answers')
export class ApplicationAnswer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('Application', (app: Application) => app.answers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'applicationId' })
  application!: Application;

  @Column({ type: 'uuid' })
  applicationId!: string;

  @ManyToOne('ScreeningQuestion', (sq: ScreeningQuestion) => sq.answers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'screeningQuestionId' })
  screeningQuestion!: ScreeningQuestion;

  @Column({ type: 'uuid' })
  screeningQuestionId!: string;

  /**
   * The candidate's answer — stored as text for all types.
   * For multi-choice: comma-separated values.
   * For file uploads: S3 key.
   * For video responses: S3 key.
   */
  @Column({ type: 'text', nullable: true })
  answerText!: string | null;

  /**
   * For choice-based answers stored as a JSON array.
   */
  @Column({ type: 'jsonb', nullable: true })
  answerOptions!: string[] | null;

  /**
   * S3 key for uploaded files or recorded media.
   */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  fileS3Key!: string | null;

  /**
   * Whether this answer triggered a knockout rule.
   */
  @Column({ type: 'boolean', default: false })
  triggeredKnockout!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
