import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { JobEntity } from 'src/jobs/entities/job.entity';
import { JobApplyEntity, ApplicationStatus } from './entities/jobApplyEntitt';
import { UserEntity } from 'src/user/entities/user.entity';
import { CreateJobApplyDto } from './dto/createjobsdto';
import { QuestionEntity } from 'src/jobs/entities/question.entity';
import { JobTestAnswerEntity } from './entities/jobTestAnswer.entity';

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



async getJobTest(jobId: number, userId: number) {
  const application = await this.jobApplyEntity.findOne({
    where: { job: { id: jobId }, user: { id: userId } },
    relations: ['job', 'job.questions', 'job.questions.options'],
  });

  if (!application) throw new ForbiddenException('You have not applied to this job');

  if (application.application_status === ApplicationStatus.WITHDRAWN) {

    application.application_status = ApplicationStatus.TEST_PENDING;
    await this.jobApplyEntity.save(application);
  } else if (application.application_status === ApplicationStatus.TEST_COMPLETED) {
    throw new ForbiddenException('You have already completed the test');
  } else {
    application.application_status = ApplicationStatus.TEST_PENDING;
    await this.jobApplyEntity.save(application);
  }
  const shuffleArray = <T>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  if (!application.job.questions || application.job.questions.length === 0) {
    return { message: 'No questions available for this job', questions: [] };
  }
  return application.job.questions.map(q => ({
    id: q.id,
    questionText: q.questionText,
    options: shuffleArray(q.options.map(o => ({ id: o.id, text: o.text }))),
  }));
}



async submitJobTest(jobId: number, userId: number, answers: { questionId: number; selectedOptionId: number }[]) {
  const application = await this.jobApplyEntity.findOne({
    where: { job: { id: jobId }, user: { id: userId } },
    relations: ['job', 'job.questions', 'job.questions.options', 'testAnswers'],
  });

  if (!application) throw new ForbiddenException('You have not applied to this job');
  let score = 0;
  const testAnswers: JobTestAnswerEntity[] = [];
  for (const ans of answers) {
    const question = application.job.questions.find(q => q.id === ans.questionId);
    if (!question) continue;
    const option = question.options.find(o => o.id === ans.selectedOptionId);
    if (!option) continue;
    const isCorrect = option.isCorrect;
    if (isCorrect) score++;
    const testAnswer = this.jobApplyEntity.manager.create(JobTestAnswerEntity, {
      application,
      question,
      selectedOptionId: ans.selectedOptionId,
      isCorrect,
    });
    testAnswers.push(testAnswer);
  }
  await this.jobApplyEntity.manager.save(testAnswers);
  application.application_status = ApplicationStatus.TEST_COMPLETED;
  await this.jobApplyEntity.save(application);
  return { message: 'Test submitted', score, total: application.job.questions.length };
}
}
