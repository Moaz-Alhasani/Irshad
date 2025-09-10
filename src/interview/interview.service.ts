import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InterviewEntity } from './entities/interview.entity';
import { privateDecrypt } from 'crypto';
import { Repository } from 'typeorm';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { JobApplyEntity } from 'src/jobapply/entities/jobApplyEntitt';
import { JobEntity } from 'src/jobs/entities/job.entity';
import { MailService } from 'src/user/gobal/MailService';
import { SendInterviewLinkDto } from './dto/interview.dto';

@Injectable()
export class InterviewService {
    constructor(@InjectRepository(InterviewEntity) private interviewRepository:Repository<InterviewEntity>,
                @InjectRepository(CompanyEntity)private companyRepository:Repository<CompanyEntity>,
                @InjectRepository(JobApplyEntity)private jobApplyRepostitory:Repository<JobApplyEntity>,
                @InjectRepository(JobEntity)private jobRepostiory:Repository<JobEntity>,
                private mailservice:MailService){
    }

    public async acceptApplicant(jobId:number,applicationId:number,sendInterviewLinkDto:SendInterviewLinkDto,company:any){
        const job=await this.jobRepostiory.findOne({
            where:{
            id:jobId
            },relations:['applications','company']
        });
        if(!job){
            throw new NotFoundException(`job not found`)
        }
        if (job.company.id!==company.id){
            throw new ForbiddenException(`you don't have the right `)
        }
        const applicant=await this.jobApplyRepostitory.findOne({
            where:{
                id:applicationId
            },
            relations:['job', 'user']
        })
        if(!applicant){
            throw new NotFoundException('applicant not found')
        }
        if(applicant.job.id!==jobId){
            throw new ForbiddenException("Applicant didn't apply for this job");
        }

        await this.mailservice.sendEmail({
            email:applicant.user.email,
            subject:sendInterviewLinkDto.subject,
            message:`${sendInterviewLinkDto.message}\nJoin here: ${sendInterviewLinkDto.linkGoogleMeet}`
        })

        const interviewsent=await this.interviewRepository.create({
            jobApplication:applicant,
            meetingUrl:sendInterviewLinkDto.linkGoogleMeet
        });
        return {
            message:'Interview link sent successfully',
            interviewsent,
            success: true
        }
    }
    
}