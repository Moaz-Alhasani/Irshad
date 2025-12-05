import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { QuestionEntity } from './question.entity';

@Entity('job_options')
export class OptionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  text: string;

  @Column({ default: false })
  isCorrect: boolean; // الفرونت سيقوم بخربطة الخيارات

  @ManyToOne(() => QuestionEntity, (question) => question.options, {
    onDelete: 'CASCADE',
  })
  question: QuestionEntity;
}
