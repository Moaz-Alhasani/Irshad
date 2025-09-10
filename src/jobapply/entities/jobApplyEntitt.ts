import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    OneToMany,
} from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';
import { JobEntity } from 'src/jobs/entities/job.entity';
import { ResumeEntity } from 'src/resumes/entities/resume.entity';
import {  InterviewEntity } from 'src/interview/entities/interview.entity';

export enum ApplicationStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
    WITHDRAWN = 'withdrawn'
}

@Entity({ name: 'job_apply' })
export class JobApplyEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    @ManyToOne(() => JobEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'job_id' })
    job: JobEntity;

    @ManyToOne(() => ResumeEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'resume_id' })
    resume: ResumeEntity;

    @OneToMany(() => InterviewEntity, (interview) => interview.jobApplication)
    interviews: InterviewEntity[];

    @Column({
        type: 'enum',
        enum: ApplicationStatus,
        default: ApplicationStatus.PENDING,
    })
    application_status: ApplicationStatus;

    @Column({ type: 'int', nullable: true })
    estimated_salary: number;

    @Column({ type: 'float', nullable: true })
    similarity_score: number | null;

    @Column({ type: 'float', nullable: true })
    ranking_score: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

}