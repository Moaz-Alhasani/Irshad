import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';

@Entity({ name: 'resumes' })
export class ResumeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  file_path: string;

  @Column("simple-array", { nullable: true })
  extracted_skills: string[];

  @Column("simple-array", { nullable: true })
  education: string[];

  @Column("simple-array", { nullable: true })
  certifications: string[];

  @Column("simple-array", { nullable: true })
  languages: string[];

  @Column({ type: 'float', nullable: true })
  experience_years: number;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  university: string;

  @Column({ nullable: true })
  location: string;

  @ManyToOne(() => UserEntity, user => user.resumes, { onDelete: 'CASCADE' })
  user: UserEntity;

  @CreateDateColumn()
  createdAt: Date;
}
