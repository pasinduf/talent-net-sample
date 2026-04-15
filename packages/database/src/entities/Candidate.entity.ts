import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import type { Application } from './Application.entity';
import type { PoolMembership } from './PoolMembership.entity';
import type { ConsentRecord } from './ConsentRecord.entity';
import type { InternalNote } from './InternalNote.entity';

@Entity('candidates')
@Index(['email'], { unique: true })
export class Candidate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country!: string | null;

  // ─── Professional profiles ────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 500, nullable: true })
  linkedInUrl!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  gitHubUrl!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  portfolioUrl!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  websiteUrl!: string | null;

  // ─── Resume & media ───────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 1000, nullable: true })
  resumeS3Key!: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  introMediaS3Key!: string | null;

  // ─── Tags / skills (HR-managed) ───────────────────────────────────────────

  @Column({ type: 'simple-array', nullable: true })
  tags!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  skills!: string[] | null;

  // ─── Communication preferences ────────────────────────────────────────────

  @Column({ type: 'boolean', default: true })
  emailOptIn!: boolean;

  @Column({ type: 'boolean', default: false })
  subscribeToJobAlerts!: boolean;

  @Column({ type: 'boolean', default: false })
  subscribeToTalentCommunity!: boolean;

  // ─── Data privacy ─────────────────────────────────────────────────────────

  @Column({ type: 'boolean', default: false })
  isAnonymized!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  anonymizedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  retentionExpiresAt!: Date | null;

  // ─── SSO identity ─────────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 255, nullable: true })
  ssoProvider!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ssoProviderId!: string | null;

  // ─── Relations ────────────────────────────────────────────────────────────

  @OneToMany('Application', (app: Application) => app.candidate)
  applications!: Application[];

  @OneToMany('PoolMembership', (pm: PoolMembership) => pm.candidate)
  poolMemberships!: PoolMembership[];

  @OneToMany('ConsentRecord', (cr: ConsentRecord) => cr.candidate)
  consentRecords!: ConsentRecord[];

  @OneToMany('InternalNote', (note: InternalNote) => note.candidate)
  notes!: InternalNote[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
