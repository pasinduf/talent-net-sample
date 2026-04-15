import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import type { Interview } from './Interview.entity';

@Entity('interview_schedules')
export class InterviewSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne('Interview', (iv: Interview) => iv.schedule, { nullable: false })
  @JoinColumn({ name: 'interviewId' })
  interview!: Interview;

  @Column({ type: 'uuid' })
  interviewId!: string;

  /**
   * Proposed time slots sent to the candidate (ISO-8601 strings).
   */
  @Column({ type: 'jsonb', nullable: true })
  proposedSlots!: { startAt: string; endAt: string }[] | null;

  /**
   * The slot the candidate confirmed.
   */
  @Column({ type: 'timestamp', nullable: true })
  confirmedStartAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  confirmedEndAt!: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  timezone!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  meetingLink!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  meetingLocation!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reminderSentAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  inviteSentAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  isRescheduled!: boolean;

  @Column({ type: 'int', default: 0 })
  rescheduleCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
