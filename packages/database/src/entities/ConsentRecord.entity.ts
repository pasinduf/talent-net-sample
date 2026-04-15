import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ConsentPurpose } from '@talent-net/types';
import type { Candidate } from './Candidate.entity';

@Entity('consent_records')
@Index(['candidateId', 'purpose'])
export class ConsentRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('Candidate', (c: Candidate) => c.consentRecords, { nullable: false })
  @JoinColumn({ name: 'candidateId' })
  candidate!: Candidate;

  @Column({ type: 'uuid' })
  candidateId!: string;

  @Column({ type: 'enum', enum: ConsentPurpose })
  purpose!: ConsentPurpose;

  @Column({ type: 'boolean' })
  isGranted!: boolean;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent!: string | null;

  /**
   * Version of the privacy notice or consent statement presented.
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  consentVersion!: string | null;

  /**
   * The job application context in which consent was collected (if applicable).
   */
  @Column({ type: 'uuid', nullable: true })
  applicationId!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
