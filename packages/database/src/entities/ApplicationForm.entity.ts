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
import type { ScreeningQuestion } from './ScreeningQuestion.entity';

@Entity('application_forms')
export class ApplicationForm {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne('Job', (job: Job) => job.applicationForm, { nullable: false })
  @JoinColumn({ name: 'jobId' })
  job!: Job;

  @Column({ type: 'uuid' })
  jobId!: string;

  @Column({ type: 'boolean', default: true })
  requireResume!: boolean;

  @Column({ type: 'boolean', default: false })
  requireCoverLetter!: boolean;

  @Column({ type: 'boolean', default: false })
  allowIntroductoryMedia!: boolean;

  @Column({ type: 'boolean', default: false })
  requirePortfolioUrl!: boolean;

  @Column({ type: 'boolean', default: false })
  requireLinkedInUrl!: boolean;

  @Column({ type: 'boolean', default: false })
  requireGitHubUrl!: boolean;

  @Column({ type: 'text', nullable: true })
  additionalInstructions!: string | null;

  @OneToMany('ScreeningQuestion', (sq: ScreeningQuestion) => sq.applicationForm, {
    cascade: true,
    eager: true,
    //orderBy: { order: 'ASC' },
  })
  screeningQuestions!: ScreeningQuestion[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
