import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { JobEntity } from './entities/job.entity';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { Repository } from 'typeorm';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
  ) {}

  async createJob(createJobDto: CreateJobDto, companyId: number): Promise<JobEntity> {
    const company = await this.companyRepository.findOne({ where: { id: companyId } });
    if (!company) throw new Error('Company not found');

    const job = this.jobRepository.create({
      ...createJobDto,
      company,
    });

    return await this.jobRepository.save(job);
  }


  async updateJob(id: number, updateDto: Partial<CreateJobDto>): Promise<JobEntity> {
    const job = await this.jobRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');

    Object.assign(job, updateDto);
    return await this.jobRepository.save(job);
  }

  async deleteJob(id: number): Promise<{ message: string }> {
    const job = await this.jobRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');

    await this.jobRepository.remove(job);
    return { message: 'Job deleted successfully' };
  }

}