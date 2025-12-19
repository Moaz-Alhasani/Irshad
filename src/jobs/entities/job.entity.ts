import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { JobApplyEntity } from 'src/jobapply/entities/jobApplyEntitt';
import { QuestionEntity } from './question.entity';
import { JobExamAttempt } from './job_exam_attempts_entity';


export enum EmploymentType {
  PART_TIME = 'part-time',
  FULL_TIME = 'full-time',
  ON_SITE = 'on-site',
  REMOTE = 'remote',
}

@Entity('jobs')
export class JobEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CompanyEntity, (company) => company.jobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: CompanyEntity;

  @OneToMany(() => JobApplyEntity, (app) => app.job)
  applications: JobApplyEntity[];

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column('text', { array: true })
  requiredSkills: string[];

  @Column({ type: 'float', nullable: true })
  requiredExperience: number;

  @Column('text', { array: true })
  requiredEducation: string[];

  @Column({ type: 'text', nullable: true })
  location: string;

  @Column({
    type: 'enum',
    enum: EmploymentType,
    default: EmploymentType.ON_SITE,
    nullable: true,
  })
  employmentType: EmploymentType;

  @Column({ nullable: true })
  image: string;

  @OneToMany(() => QuestionEntity, (q) => q.job, {
    cascade: true,
    eager: true,
  })
  questions: QuestionEntity[];
  
  @OneToMany(() => JobExamAttempt, attempt => attempt.job)
  examAttempts: JobExamAttempt[];

   // إضافة هذا الحقل
  @Column({ type: 'int', default: 5 }) // 5 دقائق افتراضياً
  testDuration: number;

  @Column('jsonb', { nullable: true })
  embedding: number[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}