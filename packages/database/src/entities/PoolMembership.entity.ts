import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { TalentPool } from './TalentPool.entity';
import type { Candidate } from './Candidate.entity';

@Entity('pool_memberships')
@Index(['talentPoolId', 'candidateId'], { unique: true })
export class PoolMembership {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('TalentPool', (tp: TalentPool) => tp.memberships, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'talentPoolId' })
  talentPool!: TalentPool;

  @Column({ type: 'uuid' })
  talentPoolId!: string;

  @ManyToOne('Candidate', (c: Candidate) => c.poolMemberships, { nullable: false })
  @JoinColumn({ name: 'candidateId' })
  candidate!: Candidate;

  @Column({ type: 'uuid' })
  candidateId!: string;

  @Column({ type: 'simple-array', nullable: true })
  tags!: string[] | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewDue!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastContactedAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  reEngagementCount!: number;

  @Column({ type: 'boolean', default: true })
  isEligibleForReEngagement!: boolean;

  @Column({ type: 'uuid', nullable: true })
  addedByUserId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
