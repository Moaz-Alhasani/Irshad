import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { JobApplyEntity } from './jobApplyEntitt';
import { QuestionEntity } from 'src/jobs/entities/question.entity';

@Entity('job_test_answers')
export class JobTestAnswerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => JobApplyEntity, app => app.testAnswers, { onDelete: 'CASCADE' })
  application: JobApplyEntity;

  @ManyToOne(() => QuestionEntity, { eager: true })
  question: QuestionEntity;

  @Column()
  selectedOptionId: number;

  @Column({ default: false })
  isCorrect: boolean;
}
