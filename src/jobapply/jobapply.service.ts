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

  
  


async applyToJob(jobId: number, currentUser: any, createJobApplyDto: CreateJobApplyDto) {
  const job = await this.jobEntity.findOne({ where: { id: jobId } });
  if (!job) throw new ForbiddenException(`Job with id ${jobId} does not exist`);

  const user = await this.userEntity.findOne({
    where: { id: currentUser.id },
    relations: ['resumes'],
  });
  if (!user) throw new ForbiddenException('User does not exist');
  if (!user.resumes?.length) throw new ForbiddenException('User has no resumes');

  const resume = user.resumes[0];

  const existingApp = await this.jobApplyEntity.findOne({
    where: { job: { id: jobId }, user: { id: currentUser.id } },
  });
  if (existingApp?.application_status === ApplicationStatus.PENDING)
    throw new ForbiddenException('You already have a pending application');
  if (existingApp?.application_status === ApplicationStatus.ACCEPTED)
    throw new ForbiddenException('You are already accepted for this job');

  const newApplication = this.jobApplyEntity.create({
    user: { id: user.id },
    job: { id: job.id },
    resume,
  }); 

  const savedApp = await this.jobApplyEntity.save(newApplication);

const salaryPayload = {
  job_title: job.title,
  age: user.age,
  experience_years: resume.experience_years || 1,
  education: Array.isArray(resume.education) && resume.education.length
    ? resume.education.join(', ')
    : 'Bachelor',
  skills: resume.extracted_skills || [],
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
    select: ['id', 'requiredSkills', 'requiredExperience'],
  });

  const similarityPayload = {
    resume_text: resumeText,
    jobs: allJobs.map(j => ({
      id: j.id,
      required: j.requiredSkills?.map(s => s.trim()) || [],
      experience_years: j.requiredExperience || 0,
    })),
  };

 
const similarityResp = await axios.post<SimilarityScore[]>(
  'http://localhost:5000/get-similarity',
  similarityPayload,
);

const similarityScore =
  similarityResp.data.find(s => s.jobId === jobId)?.score || 0;

savedApp.similarity_score = similarityScore;


let finalSalary = Math.floor(salaryResp.data.estimated_salary / 10) * 10;
if (similarityScore < 0.4) {

  const adjustmentFactor = 0.7;
  finalSalary = Math.floor(finalSalary * adjustmentFactor);
} else if (similarityScore < 0.7) {

  const adjustmentFactor = 0.85;
  finalSalary = Math.floor(finalSalary * adjustmentFactor);
} else {

  finalSalary = finalSalary;
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
