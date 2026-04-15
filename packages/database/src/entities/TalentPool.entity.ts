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
import type { Job } from './Job.entity';
import type { PoolMembership } from './PoolMembership.entity';

@Entity('talent_pools')
export class TalentPool {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * Tags used for categorisation.
   * e.g. ["junior", "backend", "nodejs"]
   */
  @Column({ type: 'simple-array', nullable: true })
  tags!: string[] | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * The job that originally populated this pool — may be null for manually created pools.
   */
  @ManyToOne('Job', (job: Job) => job.talentPools, { nullable: true })
  @JoinColumn({ name: 'sourceJobId' })
  sourceJob!: Job | null;

  @Column({ type: 'uuid', nullable: true })
  sourceJobId!: string | null;

  @Column({ type: 'uuid' })
  createdById!: string;

  @OneToMany('PoolMembership', (pm: PoolMembership) => pm.talentPool, { cascade: true })
  memberships!: PoolMembership[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
