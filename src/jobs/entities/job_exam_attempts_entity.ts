import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';
import { JobEntity } from './job.entity';

@Entity('job_exam_attempts')
@Unique(['user', 'job'])
export class JobExamAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, user => user.examAttempts, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @ManyToOne(() => JobEntity, job => job.examAttempts, {
    onDelete: 'CASCADE',
  })
  job: JobEntity;

  @CreateDateColumn()
  attemptedAt: Date;

@Column({ type: 'timestamp', nullable: true })
expiresAt: Date;

  @Column({ default: false })
  submitted: boolean;

  @Column({ type: 'int', default: 0 })
  score: number;
}
