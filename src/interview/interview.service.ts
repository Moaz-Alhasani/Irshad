import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterviewEntity } from './entities/interview.entity';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { JobApplyEntity } from 'src/jobapply/entities/jobApplyEntitt';
import { JobEntity } from 'src/jobs/entities/job.entity';
import { CreateInterviewDto } from './dto/CreateInterviewDto';
import { MailService } from '../user/gobal/MailService'


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

     private readonly mailService: MailService,
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

      await this.mailService.sendEmail({
            email: application.user.email,
            subject: 'Interview Invitation',
            message: `
        Dear ${application.user.firstName} ${application.user.lastName},

        Congratulations 🎉

        You have been shortlisted for the position:
        "${job.title}"

        We are pleased to invite you to attend an interview with:
        ${job.company.companyName}

        📅 Interview Date: ${dto.interviewDate}
        ⏰ Interview Time: ${dto.interviewTime}

        ${dto.additionalNotes ? `📝 Notes: ${dto.additionalNotes}` : ''}

        Please be on time and check your email for any updates.

        Best of luck 🍀
        ${job.company.companyName}
        Irshad Platform Team
        `,
  });

    return {
      success: true,
      message: 'Interview details saved successfully',
      interview,
    };
  }
}
