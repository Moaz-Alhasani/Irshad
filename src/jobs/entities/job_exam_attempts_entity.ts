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
    eager: false,
  })
  user: UserEntity;

  @ManyToOne(() => JobEntity, job => job.examAttempts, {
    onDelete: 'CASCADE',
    eager: false,
  })
  job: JobEntity;

  @CreateDateColumn()
  attemptedAt: Date;
}
