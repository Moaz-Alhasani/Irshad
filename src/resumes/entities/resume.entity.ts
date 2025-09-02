import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';
import { JobApplyEntity } from 'src/jobapply/entities/jobApplyEntitt';


@Entity({ name: 'resumes' })
export class ResumeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  file_path: string;

  @Column('simple-array', { nullable: true })
  extracted_skills: string[];

  @Column('simple-array', { nullable: true })
  education: string[];

  @Column('simple-array', { nullable: true })
  certifications: string[];

  @Column('simple-array', { nullable: true })
  languages: string[];

  @Column({ type: 'float', nullable: true })
  experience_years: number;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  university: string;

  @Column({ nullable: true })
  location: string;

  @Column('jsonb', { nullable: true })
  embedding: number[];

  @ManyToOne(() => UserEntity, (user) => user.resumes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @OneToMany(() => JobApplyEntity, (app) => app.resume)
  applications: JobApplyEntity[];

  @CreateDateColumn()
  createdAt: Date;
}