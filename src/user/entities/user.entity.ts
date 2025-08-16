import { 
  Column, 
  CreateDateColumn, 
  Entity, 
  PrimaryGeneratedColumn 
} from 'typeorm';

export enum UserRole {
  JOB_SEEKER = 'job_seeker',
  EMPLOYER = 'employer',
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

  @Column({  type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({})
  createdAt: Date;
}
