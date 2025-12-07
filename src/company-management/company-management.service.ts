import { ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCompanyManagementDto } from './dto/create-company-management.dto';
import { UpdateCompanyManagementDto } from './dto/update-company-management.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyEntity } from './entities/company-management.entity';
import { Repository } from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';
import { AuthService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { LoginCompanyDto } from './dto/loginCompany.dto';
import * as fs from 'fs';
import * as path from 'path';
import { JobEntity } from 'src/jobs/entities/job.entity';
import { ApplicationStatus, JobApplyEntity } from 'src/jobapply/entities/jobApplyEntitt';
import { generateFingerprint } from 'src/utils/fingerprint';
import { Request } from 'express';

@Injectable()
export class CompanyManagementService {
  constructor(
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(JobEntity)
    private readonly jobsRepository: Repository<JobEntity>,

    @InjectRepository(JobApplyEntity)
    private readonly jobApplyRepository: Repository<JobApplyEntity>,

    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,

    private readonly jwtService: JwtService,
  ) {}

  async RegisterAsCompany(
    createCompanyDto: CreateCompanyManagementDto,
    logoPath: string | null,
    fingerprint: string
  ) {
    const oldCompany = await this.companyRepository.findOne({ where: { email: createCompanyDto.email } });
    if (oldCompany) throw new ForbiddenException(`Company with ${oldCompany.email} already exists`);

    const hashedPassword = await this.authService.hashPassword(createCompanyDto.password);

    const newCompany = this.companyRepository.create({
      companyName: createCompanyDto.companyName,
      companyWebsite: createCompanyDto.companyWebsite,
      companyLocation: createCompanyDto.companyLocation,
      email: createCompanyDto.email,
      password: hashedPassword,
      companyLogo: logoPath ?? undefined,
    });

    const savedCompany = await this.companyRepository.save(newCompany);
    const tokens = this.generateToken(savedCompany, fingerprint);
    const { password, ...companyWithoutPassword } = savedCompany;

    return {
      company: companyWithoutPassword,
      ...tokens,
    };
  }


  async updateCompany(id: number, updateDto: UpdateCompanyManagementDto, logoPath?: string) {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');

    if (logoPath && company.companyLogo) {
      const oldLogoPath = path.join(process.cwd(), company.companyLogo);
      if (fs.existsSync(oldLogoPath)) fs.unlinkSync(oldLogoPath);
      updateDto.companyLogo = logoPath;
    }

    Object.assign(company, updateDto);
    return this.companyRepository.save(company);
  }

  async LoginComapny(companyDto: LoginCompanyDto, fingerprint: string) {
  const oldCompany = await this.companyRepository.findOne({
    where: { email: companyDto.email },
  });
  if (!oldCompany) throw new ForbiddenException('Company not found');

  const matchedPassword = await this.authService.verifyPassword(
    companyDto.password,
    oldCompany.password,
  );
  if (!matchedPassword) throw new ForbiddenException('Invalid password');

  const tokens = this.generateToken(oldCompany, fingerprint);

  const { password, ...companyWithoutPassword } = oldCompany;

  return {
    user: companyWithoutPassword,
    ...tokens,
  };
}

  async getCompanyJobs(companyId: number) {
    const company = await this.companyRepository.findOne({ where: { id: companyId }, relations: ['jobs'] });
    if (!company) throw new NotFoundException('Company not found');
    return company.jobs;
  }

  public async getNumberofCompanyJobs(company: any): Promise<number> {
    return await this.jobsRepository.count({ where: { company: { id: company.id } } });
  }

  public async numberofApplyForJobs(jobid: number, company: any) {
    const job = await this.jobsRepository.findOne({ where: { id: jobid }, relations: ['applications', 'company'] });
    if (!job) throw new NotFoundException('Job not found');
    if (job.company.id !== company.id) throw new ForbiddenException(`You don't have the right`);

    const jobWithApplications = await this.jobsRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.applications', 'application')
      .leftJoinAndSelect('application.user', 'user')
      .where('job.id = :jobId', { jobId: jobid })
      .orderBy('application.ranking_score', 'DESC')
      .getOne();

    return {
      applicants: jobWithApplications?.applications ?? [],
      totalApplicants: jobWithApplications?.applications.length ?? 0,
    };
  }

  async acceptTheUseraftertheinterviewservice(userId: number) {
    const jobApplication = await this.jobApplyRepository.findOne({
      where: { user: { id: userId }, application_status: ApplicationStatus.PENDING },
      relations: ['user', 'job', 'resume'],
    });

    if (!jobApplication) throw new NotFoundException('No pending application found for this user.');

    jobApplication.application_status = ApplicationStatus.ACCEPTED;
    await this.jobApplyRepository.save(jobApplication);

    return { message: 'User application accepted', application: jobApplication };
  }

  async rejectTheUseraftertheinterviewservice(userId: number) {
    const jobApplication = await this.jobApplyRepository.findOne({
      where: { user: { id: userId }, application_status: ApplicationStatus.PENDING },
      relations: ['user', 'job', 'resume'],
    });

    if (!jobApplication) throw new NotFoundException('No pending application found for this user.');

    jobApplication.application_status = ApplicationStatus.REJECTED;
    await this.jobApplyRepository.save(jobApplication);

    return { message: 'User application rejected', application: jobApplication };
  }

  private generateToken(company: CompanyEntity, fingerprint: string) {
  return {
    accessToken: this.generateAccessToken(company, fingerprint),
    refreshToken: this.generateRefreshToken(company, fingerprint),
  };
}

private generateAccessToken(company: CompanyEntity, fingerprint: string): string {
  const payload = {
    sub: company.id,
    email: company.email,
    role: company.role,
    fingerprint,
  };

  return this.jwtService.sign(payload, {
    secret: process.env.JWT_SECRET || 'jwt_secret',
    expiresIn: '15m',
  });
}

private generateRefreshToken(company: CompanyEntity, fingerprint: string): string {
  const payload = {
    sub: company.id,
    fingerprint,
  };

  return this.jwtService.sign(payload, {
    secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    expiresIn: '7d',
  });
}

public async getcompanycount():Promise<number>{
  return await this.companyRepository.count();
}

}
