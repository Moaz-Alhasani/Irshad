import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CompanyEntity } from '../../company-management/entities/company-management.entity';

@Entity('jobs')
export class JobEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CompanyEntity, company => company.jobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: CompanyEntity;

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

  @Column({ type: 'varchar', length: 50, nullable: true })
  employmentType: string;

  @Column({ nullable: true })
  image: string;

  @Column({ type: 'float', transformer: { to: v => v, from: v => v }, nullable: true })
  embedding: number[]; 

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
