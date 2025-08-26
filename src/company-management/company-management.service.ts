import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCompanyManagementDto } from './dto/create-company-management.dto';
import { UpdateCompanyManagementDto } from './dto/update-company-management.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyEntity } from './entities/company-management.entity';
import { Repository } from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';

@Injectable()
export class CompanyManagementService {
  
   constructor(
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}
  

  async createCompany(createCompanyDto: CreateCompanyManagementDto, userId: number): Promise<CompanyEntity> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const company = this.companyRepository.create({
      ...createCompanyDto,
      user,
    });

    return await this.companyRepository.save(company);
  }


  async getCompanyJobs(companyId: number) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['jobs'],
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company.jobs;
  }
}
