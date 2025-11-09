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
  similarity_score?: number; 
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

  
  


async applyToJob(jobId: number, currentUser: any, createJobApplyDto: CreateJobApplyDto) {
  const job = await this.jobEntity.findOne({ where: { id: jobId } });
  if (!job) throw new ForbiddenException(`Job with id ${jobId} does not exist`);

 const user = await this.userEntity.findOne({
      where: { id: currentUser.id },
      relations: ['resumes'],
    });
    if (!user) throw new ForbiddenException('User does not exist');
    if (!user.resumes?.length) throw new ForbiddenException('You must upload a resume before applying to a job');

    const resume = user.resumes[0];

  const existingApp = await this.jobApplyEntity.findOne({
    where: { job: { id: jobId }, user: { id: currentUser.id } },
    relations: ['user', 'job', 'resume'],
  });
  console.log('Existing Application:', existingApp);
 if (existingApp) {
      if (
        existingApp.application_status === ApplicationStatus.PENDING ||
        existingApp.application_status === ApplicationStatus.ACCEPTED
      ) {
        throw new ForbiddenException('You already applied for this job. You can only reapply after your application is withdrawn or rejected.',);
      }
    }

  const newApplication = this.jobApplyEntity.create({
    user: { id: user.id },
    job: { id: job.id },
    resume,
  }); 

  const savedApp = await this.jobApplyEntity.save(newApplication);

  const salaryPayload = {
    candidate_skills: resume.extracted_skills || [],
    candidate_experience: resume.experience_years || 1,
    candidate_education: Array.isArray(resume.education) && resume.education.length
      ? resume.education
      : ['Bachelor'],

    job_title: job.title,
    job_required_skills: job.requiredSkills || [],
    job_required_experience: job.requiredExperience || 0,
  };

  const salaryResp = await axios.post<SalaryResponse>(
    'http://localhost:5000/predict-salary',
    salaryPayload,
  );

  savedApp.estimated_salary = Math.floor(salaryResp.data.estimated_salary / 10) * 10;
  const resumeText = [
    ...(resume.extracted_skills || []),
    resume.experience_years ? `Experience: ${resume.experience_years} years` : '',
    ...(resume.education || []),
  ].join(' ');

const allJobs = await this.jobEntity.find({
  select: ['id', 'title', 'description', 'requiredSkills', 'requiredExperience', 'requiredEducation'],
});



  const similarityScore = salaryResp.data.similarity_score || 0;

  savedApp.similarity_score = similarityScore;
  savedApp.ranking_score=similarityScore
  let finalSalary = Math.floor(salaryResp.data.estimated_salary / 10) * 10;
  if (similarityScore < 0.4) {
    finalSalary = Math.floor(finalSalary * 0.7);
  } else if (similarityScore < 0.7) {
    finalSalary = Math.floor(finalSalary * 0.85);
  }

  savedApp.estimated_salary = finalSalary;

  return this.jobApplyEntity.save(savedApp);
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
