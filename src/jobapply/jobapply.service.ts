import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { JobEntity } from 'src/jobs/entities/job.entity';
import { JobApplyEntity, ApplicationStatus } from './entities/jobApplyEntitt';
import { UserEntity } from 'src/user/entities/user.entity';
import { CreateJobApplyDto } from './dto/createjobsdto';


interface SalaryResponse {
  estimated_salary: number;
  monthly_salary: number;
}

interface SimilarityScore {
  jobId: number;
  score: number;
}

@Injectable()
export class JobapplyService {
  constructor(
    @InjectRepository(JobEntity) private jobEntity: Repository<JobEntity>,
    @InjectRepository(JobApplyEntity) private jobApplyEntity: Repository<JobApplyEntity>,
    @InjectRepository(UserEntity) private userEntity: Repository<UserEntity>,
  ) {}

  async JobApply(jobid: number, currentuser: any, createjobapplydto: CreateJobApplyDto) {
    const jobExists = await this.jobExist(jobid);
    if (!jobExists) {
      throw new ForbiddenException(`Job with id ${jobid} does not exist`);
    }

    const olduser = await this.userEntity.findOne({
      where: { id: currentuser.id },
      relations: ['resumes'],
    });
    if (!olduser) {
      throw new ForbiddenException(`User with id ${currentuser.id} does not exist`);
    }
    if (!olduser?.resumes || olduser.resumes.length === 0) {
      throw new ForbiddenException(`User does not have any resumes`);
    }

    const application = await this.jobApplyEntity.findOne({
      where: {
        job: { id: jobid },
        user: { id: currentuser.id },
      },
      relations: ['job', 'user'],
    });

    if (application?.application_status === ApplicationStatus.PENDING) {
      throw new ForbiddenException('You already have a pending application for this job');
    }
    if (application?.application_status === ApplicationStatus.ACCEPTED) {
      throw new ForbiddenException('You have already been accepted for this job');
    }

    const applied = this.jobApplyEntity.create({
      user: { id: currentuser.id },
      job: { id: jobid },
      resume: olduser.resumes[0],
    });
    const savedApp = await this.jobApplyEntity.save(applied);

    const resume = olduser.resumes[0];
    const job = jobExists;

    const salaryPayload = {
      experience_years: resume.experience_years,
      skills: resume.extracted_skills.join(', '),
      education: resume.education.join(', '),
      role: job.title || 'AI',
      work_type: job.employmentType || 'Remote',
    };
    const salaryResp = await axios.post<SalaryResponse>(
    'http://localhost:5000/predict-salary',
    salaryPayload,
    );

    const jobs = await this.jobEntity.find({ select: ['id', 'embedding'] });
    const similarityPayload = {
      resume_embedding: resume.embedding,
      jobs: jobs.map((j) => ({ id: j.id, embedding: j.embedding })),
    };

    const similarityResp = await axios.post<SimilarityScore[]>(
    'http://localhost:5000/get-similarity',
    similarityPayload,
    );

    savedApp.estimated_salary = salaryResp.data.estimated_salary;
    const simScore =
      similarityResp.data.find((s) => s.jobId === jobid)?.score || null;
    savedApp.similarity_score = simScore;

    return await this.jobApplyEntity.save(savedApp);
  }




  
  async withdraw(jobid: number, currentuser: any) {
    const application = await this.jobApplyEntity.findOne({
      where: {
        job: { id: jobid },
        user: { id: currentuser.id },
      },
      relations: ['job', 'user'],
    });

    if (!application) {
      throw new ForbiddenException(`You have not applied to this job`);
    }

    if (application.application_status === ApplicationStatus.ACCEPTED) {
      throw new ForbiddenException(`You cannot withdraw after being accepted`);
    }

    application.application_status = ApplicationStatus.WITHDRAWN;
    return await this.jobApplyEntity.save(application);
  }

  private async jobExist(jobid: number): Promise<JobEntity | null> {
    return await this.jobEntity.findOne({ where: { id: jobid } });
  }
}
