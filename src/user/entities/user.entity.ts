import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { ResumeEntity } from 'src/resumes/entities/resume.entity';
import { 
  Column, 
  CreateDateColumn, 
  Entity, 
  JoinColumn, 
  ManyToOne, 
  OneToMany, 
  PrimaryGeneratedColumn 
} from 'typeorm';

export enum UserRole {
  JOB_SEEKER = 'job_seeker',
  ADMIN = 'admin',
}

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({  type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({  type: 'text' })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.JOB_SEEKER,
  })
  role: UserRole;


  @ManyToOne(() => CompanyEntity, (company) => company.employees, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'company_id' })
  company: CompanyEntity;

  @OneToMany(() => ResumeEntity, resume => resume.user)
  resumes: ResumeEntity[];


  @Column({  type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({})
  createdAt: Date;
}
