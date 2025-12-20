import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { JobEntity } from './job.entity';
import { OptionEntity } from './option.entity';

@Entity('job_questions')
export class QuestionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  questionText: string;

  @ManyToOne(() => JobEntity, (job) => job.questions, { onDelete: 'CASCADE' })
  job: JobEntity;

  @OneToMany(() => OptionEntity, (option) => option.question, {
    cascade: true,
    eager: true, 
  })
  options: OptionEntity[];
  @Column({ type: 'int', default: 600 })
  testDuration: number;
}
