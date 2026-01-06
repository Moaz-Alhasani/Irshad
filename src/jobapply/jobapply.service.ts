import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { JobEntity } from 'src/jobs/entities/job.entity';
import { JobApplyEntity, ApplicationStatus, TestStatus } from './entities/jobApplyEntitt';
import { UserEntity } from 'src/user/entities/user.entity';
import { CreateJobApplyDto } from './dto/createjobsdto';
import { QuestionEntity } from 'src/jobs/entities/question.entity';
import { JobTestAnswerEntity } from './entities/jobTestAnswer.entity';
import { JobExamAttempt } from 'src/jobs/entities/job_exam_attempts_entity';

interface SalaryResponse {
  estimated_salary: number;
  monthly_salary: number;
  similarity_score?: number; 
}

interface SimilarityScore {
  jobId: number;
  score: number;
}

interface AcceptanceResponse {
  acceptance_score: number;
  matched_skills?: string[];
  skill_match_score?: number;
  title_match?: number;
  description_match?: number;
}

@Injectable()
export class JobapplyService {
  constructor(
    @InjectRepository(JobEntity) private jobEntity: Repository<JobEntity>,
    @InjectRepository(JobApplyEntity) private jobApplyEntity: Repository<JobApplyEntity>,
    @InjectRepository(UserEntity) private userEntity: Repository<UserEntity>,
    @InjectRepository(JobExamAttempt) private JobExamAttempt: Repository<JobExamAttempt>, 
  ) {}

  
  

async applyToJob(jobId: number,currentUser: any,createJobApplyDto: CreateJobApplyDto,) {
  const job = await this.jobEntity.findOne({ where: { id: jobId } });
  if (!job)
    throw new ForbiddenException(`Job with id ${jobId} does not exist`);

  const user = await this.userEntity.findOne({
    where: { id: currentUser.id },
    relations: ['resumes'],
  });
  if (!user) throw new ForbiddenException('User does not exist');
  if (!user.resumes?.length)
    throw new ForbiddenException(
      'You must upload a resume before applying to a job',
    );

  const resume = user.resumes[0];

  const existingApp = await this.jobApplyEntity.findOne({
    where: { job: { id: jobId }, user: { id: currentUser.id } },
    relations: ['user', 'job', 'resume'],
  });

  if (existingApp) {
    if (
      existingApp.application_status === ApplicationStatus.PENDING ||
      existingApp.application_status === ApplicationStatus.ACCEPTED
    ) {
      throw new ForbiddenException(
        'You already applied for this job. You can only reapply after your application is withdrawn or rejected.',
      );
    }

    await this.jobApplyEntity.remove(existingApp);
  }

  const newApplication = this.jobApplyEntity.create({
    user: { id: user.id },
    job: { id: job.id },
    resume,
  });

  let savedApp = await this.jobApplyEntity.save(newApplication);


  const acceptancePayload = {
    candidate_skills: resume.extracted_skills || [],
    job_title: job.title,
    job_required_skills: job.requiredSkills || [],
    job_description: job.description || '',
  };

  const acceptanceResp = await axios.post<AcceptanceResponse>(
    'http://localhost:5000/predict-acceptance',
    acceptancePayload,
  );

  const acceptanceScore = acceptanceResp.data.acceptance_score;
  savedApp.acceptance_score = acceptanceScore;
  savedApp.ranking_score=acceptanceScore
  const salaryPayload = {
    candidate_skills: resume.extracted_skills || [],
    candidate_experience: resume.experience_years || 1,
    candidate_education:
      resume.education?.length && Array.isArray(resume.education)
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

  let finalSalary = Math.floor(salaryResp.data.estimated_salary / 10) * 10;

  if (acceptanceScore < 0.4) finalSalary = Math.floor(finalSalary * 0.7);
  else if (acceptanceScore < 0.7) finalSalary = Math.floor(finalSalary * 0.85);

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



async submitJobTest(
  jobId: number,
  userId: number,
  answers: { questionId: number; selectedOptionId: number }[],
) {
  if (!Array.isArray(answers))
    throw new BadRequestException('Answers must be an array');

  const application = await this.jobApplyEntity.findOne({
    where: { job: { id: jobId }, user: { id: userId } },
    relations: ['job', 'job.questions', 'job.questions.options'],
  });

  if (!application)
    throw new ForbiddenException('You have not applied');


  const attempt = await this.JobExamAttempt.findOne({
    where: { user: { id: userId }, job: { id: jobId } },
  });

  if (!attempt)
    throw new ForbiddenException('Test not started');

  if (attempt.submitted)
    throw new ForbiddenException('Test already submitted');


  if (new Date() > attempt.expiresAt) {
 
    attempt.score = 0;
    attempt.submitted = true;
    await this.JobExamAttempt.save(attempt);

    application.test_score = 0;
    application.test_status = TestStatus.EXPIRED;
    await this.jobApplyEntity.save(application);

    return {
      message: 'Time is over, score set to 0',
      score: 0,
      total: application.job.questions.length,
    };
  }


  let score = 0;
  const testAnswers: JobTestAnswerEntity[] = [];

  for (const ans of answers) {
    const question = application.job.questions.find(
      q => q.id === ans.questionId,
    );
    if (!question) continue;

    const option = question.options.find(
      o => o.id === ans.selectedOptionId,
    );
    if (!option) continue;

    if (option.isCorrect) score++;

    const testAnswer = this.jobApplyEntity.manager.create(
      JobTestAnswerEntity,
      {
        application,
        question,
        selectedOptionId: ans.selectedOptionId,
        isCorrect: option.isCorrect,
      },
    );

    testAnswers.push(testAnswer);
  }

  await this.jobApplyEntity.manager.save(testAnswers);

  application.test_score = score;
  application.test_status = TestStatus.COMPLETED;
  await this.jobApplyEntity.save(application);

  attempt.score = score;
  attempt.submitted = true;
  await this.JobExamAttempt.save(attempt);

  return {
    message: 'Test submitted successfully',
    score,
    total: application.job.questions.length,
  };
}




async getApplicantsWithResults(jobId: number, companyId: number) {
  const job = await this.jobEntity.findOne({
    where: {
      id: jobId,
      company: { id: companyId },
    },
  });

  if (!job) {
    throw new ForbiddenException('You do not own this job');
  }

  return this.jobApplyEntity.find({
    where: {
      job: { id: jobId },
    },
    relations: ['user'],
    select: {
      id: true,
      application_status: true,
      test_score: true,
      user: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    order: {
      test_score: 'DESC',
    },
  });
}

}
