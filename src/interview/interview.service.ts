import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterviewEntity } from './entities/interview.entity';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { JobApplyEntity } from 'src/jobapply/entities/jobApplyEntitt';
import { JobEntity } from 'src/jobs/entities/job.entity';
import { CreateInterviewDto } from './dto/CreateInterviewDto';

@Injectable()
export class InterviewService {
  constructor(
    @InjectRepository(InterviewEntity)
    private interviewRepository: Repository<InterviewEntity>,
    @InjectRepository(CompanyEntity)
    private companyRepository: Repository<CompanyEntity>,
    @InjectRepository(JobApplyEntity)
    private jobApplyRepository: Repository<JobApplyEntity>,
    @InjectRepository(JobEntity)
    private jobRepository: Repository<JobEntity>,
  ) {}

  public async createInterview(
    jobId: number,
    applicationId: number,
    dto: CreateInterviewDto,
    company: any,
  ) {

    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['company'],
    });

    if (!job) throw new NotFoundException('Job not found');
    if (job.company.id !== company.id)
      throw new ForbiddenException('Access denied');
    const application = await this.jobApplyRepository.findOne({
      where: { id: applicationId },
      relations: ['job', 'user'],
    });

    if (!application) throw new NotFoundException('Application not found');
    if (application.job.id !== jobId)
      throw new ForbiddenException('Invalid application');


      const interview = new InterviewEntity();
      interview.jobApplication = application; 
      interview.interviewDate = dto.interviewDate;
      interview.interviewTime = dto.interviewTime;

      interview.additionalNotes = dto.additionalNotes || null;

      await this.interviewRepository.save(interview);

    return {
      success: true,
      message: 'Interview details saved successfully',
      interview,
    };
  }
}
