import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IntegritySignalSeverity } from '@talent-net/types';
import type { Interview } from './Interview.entity';

export enum IntegritySignalType {
  MISSING_CAMERA = 'missing_camera',
  MULTIPLE_FACES = 'multiple_faces',
  REPEATED_SESSION_INTERRUPTION = 'repeated_session_interruption',
  UNUSUAL_RESPONSE_PATTERN = 'unusual_response_pattern',
  MATERIAL_INCONSISTENCY = 'material_inconsistency',
  PROHIBITED_ITEM_DETECTED = 'prohibited_item_detected',
  LONG_PAUSE = 'long_pause',
  READING_FROM_NOTES = 'reading_from_notes',
  CUSTOM = 'custom',
}

export enum IntegritySignalResolution {
  PENDING = 'pending',
  DISMISSED = 'dismissed',
  CONFIRMED = 'confirmed',
  ESCALATED = 'escalated',
}

@Entity('integrity_signals')
export class IntegritySignal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('Interview', (iv: Interview) => iv.integritySignals, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'interviewId' })
  interview!: Interview;

  @Column({ type: 'uuid' })
  interviewId!: string;

  @Column({ type: 'enum', enum: IntegritySignalType })
  signalType!: IntegritySignalType;

  @Column({
    type: 'enum',
    enum: IntegritySignalSeverity,
    default: IntegritySignalSeverity.INFORMATIONAL,
  })
  severity!: IntegritySignalSeverity;

  @Column({ type: 'text', nullable: true })
  details!: string | null;

  /**
   * Timestamp within the interview session when the signal was detected.
   */
  @Column({ type: 'int', nullable: true })
  detectedAtSeconds!: number | null;

  @Column({
    type: 'enum',
    enum: IntegritySignalResolution,
    default: IntegritySignalResolution.PENDING,
  })
  resolution!: IntegritySignalResolution;

  @Column({ type: 'text', nullable: true })
  resolutionNotes!: string | null;

  @Column({ type: 'uuid', nullable: true })
  resolvedByUserId!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
