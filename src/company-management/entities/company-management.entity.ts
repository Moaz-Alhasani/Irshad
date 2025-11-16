import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';
import { JobEntity } from 'src/jobs/entities/job.entity';


export enum CompanyRole {
  COMPANY = 'company',
}

@Entity('companies')
export class CompanyEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_email', type: 'varchar', unique: true })
  email: string;

  @Column({ name: 'company_password', type: 'text' })
  password: string;

  // @OneToMany(() => UserEntity, (user) => user.company)
  // employees: UserEntity[];

  @OneToMany(() => JobEntity, (job) => job.company)
  jobs: JobEntity[];

  @Column({ name: 'company_name', type: 'varchar', length: 200 })
  companyName: string;

  @Column({ name: 'company_website', type: 'text', nullable: true })
  companyWebsite?: string;

  @Column({ name: 'company_location', type: 'text', nullable: true })
  companyLocation?: string;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @Column({name:'company_logo', type:'varchar', length:255, nullable:true})
  companyLogo?: string;

  @Column({
    type: 'enum',
    enum: CompanyRole,
    default: CompanyRole.COMPANY,
  })
  role: CompanyRole;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
