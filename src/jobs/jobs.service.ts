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

  async getAllJobsWithEmbedding() {
    const jobs = await this.jobRepository.find({ relations: ['company'] });
    return jobs
      .filter((job) => job.company)
      .map((job) => ({
        id: job.id,
        title: job.title,
        required: job.requiredSkills,
        requiredExperience: job.requiredExperience,
        requiredEdu: job.requiredEducation,
        typejob: job.employmentType,
        embedding: job.embedding,
        company: { id: job.company.id, name: job.company.companyName },
      }));
  }


  async getAllJobs():Promise<JobEntity[]>{
    const AllJobjs=await this.jobRepository.find({
      order:{
        'createdAt':'DESC'
      },
      relations:['company']
    })
    return AllJobjs
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

}
