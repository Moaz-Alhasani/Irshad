import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { JobEntity } from './entities/job.entity';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from 'src/user/entities/user.entity';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
  ) {}

  async createJob(createJobDto: CreateJobDto, companyId: number,user:any): Promise<JobEntity> {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
        relations: ['user'], 
      });

    if (!company) throw new Error('Company not found');

    if(!company.isVerified){
      throw new ForbiddenException("your company cannot post any job right now")
    }

    if(company.user.id!==user.id){
      throw new ForbiddenException('You cannot post this job');
    }

    const job = this.jobRepository.create({
      ...createJobDto,
      company,
    });

    return await this.jobRepository.save(job);
  }


  async updateJob(id: number, updateDto: Partial<CreateJobDto>,user:any): Promise<JobEntity> {
    const job = await this.jobRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');

    if((job.company.user.id!==user.id)||(user.role!==UserRole.ADMIN)){
      throw new ForbiddenException('You cannot edit this job');
    }

    Object.assign(job, updateDto);
    return await this.jobRepository.save(job);
  }

  async deleteJob(id: number,user:any): Promise<{ message: string }> {
    const job = await this.jobRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    if((job.company.user.id!==user.id)||(user.role!==UserRole.ADMIN)){
      throw new ForbiddenException('You cannot delete this job');
    }
    await this.jobRepository.remove(job);
    return { message: 'Job deleted successfully' };
  }

}