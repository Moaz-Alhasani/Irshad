import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { JobApplyEntity } from 'src/jobapply/entities/jobApplyEntitt';

@Entity('interviews')
export class InterviewEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => JobApplyEntity, (jobApplication) => jobApplication.interviews, {
        onDelete: 'CASCADE',
    })
    jobApplication: JobApplyEntity;

    @Column({ type: 'text' })
    meetingUrl: string;

    @Column({ type: 'timestamp' })
    scheduledTime: Date;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;
}
