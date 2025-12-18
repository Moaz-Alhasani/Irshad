import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { ResumeEntity } from 'src/resumes/entities/resume.entity';
import { JobApplyEntity } from 'src/jobapply/entities/jobApplyEntitt';
import { JobExamAttempt } from 'src/jobs/entities/job_exam_attempts_entity';


export enum UserRole {
  JOB_SEEKER = 'job_seeker',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ type: 'text' })
  password: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column({ type: 'int', nullable: true })
  age: number;


  @BeforeInsert()
  @BeforeUpdate()
  validateAndCalculateAge() {
    if (this.birthDate) {
      const today = new Date();
      const birthDate = new Date(this.birthDate);
      if (birthDate > today) {
        throw new Error('Birth date cannot be in the future');
      }
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();

      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }

      this.age = age;
    }
  }

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.JOB_SEEKER,
  })
  role: UserRole;

  // @ManyToOne(() => CompanyEntity, (company) => company.employees, {
  //   nullable: true,
  //   onDelete: 'SET NULL',
  // })
  @JoinColumn({ name: 'company_id' })
  company: CompanyEntity;

  @OneToMany(() => ResumeEntity, (resume) => resume.user)
  resumes: ResumeEntity[];

  @OneToMany(() => JobApplyEntity, (app) => app.user)
  applications: JobApplyEntity[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  profileImage: string;

  @OneToMany(() => JobExamAttempt, attempt => attempt.user)
  examAttempts: JobExamAttempt[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
  @Column({type: 'boolean', default: false })
  isVerify:boolean
  @CreateDateColumn()
  createdAt: Date;
}