import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { JobEntity } from './entities/job.entity';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { ILike, Like, Repository } from 'typeorm';
import { UserRole } from 'src/user/entities/user.entity';
import { CompanyRole } from 'src/company-management/entities/company-management.entity';
import axios from 'axios';
import { SearchJobDto } from './dto/job_filter_dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QuestionEntity } from './entities/question.entity';
import { OptionEntity } from './entities/option.entity';
import { JobResponseDto } from './dto/JobResponse.dto';
import { JobDetailDto } from './dto/job-details.dto';
import { JobExamAttempt } from './entities/job_exam_attempts_entity';
import { ApplicationStatus, JobApplyEntity } from 'src/jobapply/entities/jobApplyEntitt';

interface FlaskEmbeddingResponse {
  embedding: number[];
}

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    @InjectRepository(OptionEntity)
    private readonly optionRepository: Repository<OptionEntity>,
    @InjectRepository(JobExamAttempt)
    private readonly jobExamAttemptRepository :Repository<JobExamAttempt>,
    @InjectRepository(JobApplyEntity)
    private readonly jobApplyRepository: Repository<JobApplyEntity>,
  ) {}

async createJob(createJobDto: CreateJobDto, companyId: number, company: any): Promise<JobEntity> {
  const companyEntity = await this.companyRepository.findOne({
    where: { id: companyId },
  });

  if (!companyEntity) throw new NotFoundException('Company not found');
  if (!companyEntity.isVerified)
    throw new ForbiddenException('Your company cannot post any job right now');

  let skills: string[] = [];
  if (createJobDto.requiredSkills?.length) {
    skills = createJobDto.requiredSkills
      .map((skill) => skill.replace(/[\[\]"]+/g, '').trim())
      .filter((skill) => skill.length > 0);
  }
  const job = this.jobRepository.create({
    ...createJobDto,
    company: companyEntity,
    requiredSkills: skills,
  });

  return await this.jobRepository.save(job);
}


async addQuestion(jobId: number, createQuestionDto: CreateQuestionDto) {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const question = this.questionRepository.create({
      questionText: createQuestionDto.questionText,
      job,
      testDuration: createQuestionDto.testDuration ,
    });

    const savedQuestion = await this.questionRepository.save(question);

    const options = createQuestionDto.options.map(opt =>
      this.optionRepository.create({
        text: opt.text,
        isCorrect: opt.isCorrect,
        question: savedQuestion,
      }),
    );

    savedQuestion.options = await this.optionRepository.save(options);

    return { message: 'Questions Added successfully' };
  }
// في jobs.service.ts
async getShuffledJobQuestions(jobId: number, userId: number) {

  // 1️⃣ تحقق أنه متقدم على الوظيفة
  const application = await this.jobApplyRepository.findOne({
    where: { job: { id: jobId }, user: { id: userId } },
  });

  if (!application)
    throw new ForbiddenException('You must apply before taking the test');

  // 2️⃣ تحقق أنه لم يبدأ الاختبار سابقًا
  const existingAttempt = await this.jobExamAttemptRepository.findOne({
    where: { user: { id: userId }, job: { id: jobId } },
  });

  if (existingAttempt)
    throw new ForbiddenException('Test already started');

  // 3️⃣ جلب الأسئلة
  const job = await this.jobRepository.findOne({
    where: { id: jobId },
    relations: ['questions', 'questions.options'],
  });

  if (!job)
    throw new NotFoundException('Job not found');

  // ✅ مدة الاختبار بالدقائق مباشرة
  const durationMinutes = job.questions[0]?.testDuration; // إذا لم يوجد مدة محددة نستخدم 5 دقائق
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000); // تحويل الدقائق إلى مللي ثانية

  // 5️⃣ إنشاء Attempt
  await this.jobExamAttemptRepository.save({
    user: { id: userId },
    job: { id: jobId },
    expiresAt,
    submitted: false,
  });

  // 6️⃣ خلط الخيارات
  const shuffleArray = <T>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  return {
    testDurationMinutes: durationMinutes,
    questions: job.questions.map(q => ({
      id: q.id,
      questionText: q.questionText,
      options: shuffleArray(
        q.options.map(o => ({
          id: o.id,
          text: o.text,
        })),
      ),
    })),
  };
}







async getJobDetails(id: number): Promise<JobDetailDto> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['company', 'questions', 'questions.options'],
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return new JobDetailDto(job);
  }

  async updateJob(id: number, updateDto: Partial<CreateJobDto>, company: any): Promise<JobEntity> {
    const job = await this.jobRepository.findOne({ where: { id }, relations: ['company'] });
    if (!job) throw new NotFoundException('Job not found');

    if (job.company.id !== company.id) {
      throw new ForbiddenException('You cannot edit this job');
    }

    Object.assign(job, updateDto);
    return await this.jobRepository.save(job);
  }

  async deleteJob(id: number, actor: any): Promise<{ message: string }> {
    const job = await this.jobRepository.findOne({ where: { id }, relations: ['company'] });
    if (!job) throw new NotFoundException('Job not found');

    if (
      actor.role !== UserRole.ADMIN &&
      !(actor.role === CompanyRole.COMPANY && job.company.id === actor.id)
    ) {
      throw new ForbiddenException('You cannot delete this job');
    }

    await this.jobRepository.remove(job);
    return { message: 'Job deleted successfully' };
  }




  async getAllJobs():Promise<JobResponseDto[]>{
    const AllJobjs=await this.jobRepository.find({
      order:{
        'createdAt':'DESC'
      },
      relations:['company']
    })
    return AllJobjs.map(job => new JobResponseDto(job));
  }



  async searchJobs(searchJobDto: SearchJobDto): Promise<JobEntity[]> {
  const { title, location, jobType } = searchJobDto;

  const whereOptions: any = {};

  if (title) {
    whereOptions['title'] = ILike(`%${title.trim().replace(/['"]+/g, '')}%`);
  }

  if (location) {
    whereOptions['location'] = ILike(`%${location.trim().replace(/['"]+/g, '')}%`);
  }

  if (jobType) {
    whereOptions['employmentType'] = jobType;
  }

  const allJobs = await this.jobRepository.find({
    where: whereOptions,
    relations: ['company'],
    order: { createdAt: 'DESC' },
  });

  return allJobs;
}

public async getjobsCount():Promise<number>{
  return await this.jobRepository.count();
}

}
