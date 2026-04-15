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
import type { User } from './User.entity';
import type { Candidate } from './Candidate.entity';
import type { Application } from './Application.entity';

@Entity('internal_notes')
@Index(['candidateId'])
@Index(['applicationId'])
export class InternalNote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('User', (user: User) => user.notes, { nullable: false })
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @Column({ type: 'uuid' })
  authorId!: string;

  @ManyToOne('Candidate', (c: Candidate) => c.notes, { nullable: true })
  @JoinColumn({ name: 'candidateId' })
  candidate!: Candidate | null;

  @Column({ type: 'uuid', nullable: true })
  candidateId!: string | null;

  @ManyToOne('Application', (app: Application) => app.notes, { nullable: true })
  @JoinColumn({ name: 'applicationId' })
  application!: Application | null;

  @Column({ type: 'uuid', nullable: true })
  applicationId!: string | null;

  @Column({ type: 'text' })
  content!: string;

  /**
   * If set, only users with these roles can read this note.
   */
  @Column({ type: 'simple-array', nullable: true })
  visibleToRoles!: string[] | null;

  /**
   * Structured feedback category (e.g. "technical", "culture", "general").
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null;

  @Column({ type: 'boolean', default: false })
  isPinned!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
