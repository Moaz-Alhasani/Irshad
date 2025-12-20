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

  @Column({ type: 'date' })
  interviewDate: string;

  @Column({ type: 'time' })
  interviewTime: string;

  @Column({ type: 'text', nullable: true })
  additionalNotes: string | null; 

  @Column({ type: 'text', nullable: true })
  meetingUrl: string | null; 
  
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
