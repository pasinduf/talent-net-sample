import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Interview } from './Interview.entity';
import type { User } from './User.entity';

@Entity('interview_participants')
export class InterviewParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('Interview', (iv: Interview) => iv.participants, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'interviewId' })
  interview!: Interview;

  @Column({ type: 'uuid' })
  interviewId!: string;

  @ManyToOne('User', (user: User) => user.interviewParticipations, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 50, default: 'interviewer' })
  role!: 'lead' | 'interviewer' | 'observer';

  @Column({ type: 'jsonb', nullable: true })
  scorecardAnswers!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  freeTextFeedback!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  recommendation!: string | null;

  @Column({ type: 'boolean', default: false })
  hasFeedbackSubmitted!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  feedbackSubmittedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
