import { ConflictException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
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
    company: companyWithoutPassword,
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

public async getAllCompaniesWithStatus(
  status: 'all' | 'pending' | 'approved' = 'all',
) {
  const qb = this.companyRepository.createQueryBuilder('company');
  if (status === 'pending') {
    qb.where('company.isVerified = :isVerified', { isVerified: false });
  }

  if (status === 'approved') {
    qb.where('company.isVerified = :isVerified', { isVerified: true });
  }
  const companies = await qb
    .select([
      'company.id',
      'company.companyName',
      'company.email',
      'company.companyWebsite',
      'company.companyLocation',
      'company.companyLogo',
      'company.isVerified',
      'company.createdAt',
    ])
    .orderBy('company.createdAt', 'DESC')
    .getMany();

  return companies.map(company => ({
    id: company.id,
    companyName: company.companyName,
    email: company.email,
    website: company.companyWebsite || null,
    location: company.companyLocation || null,
    logo: company.companyLogo || null,
    status: company.isVerified ? 'مقبول' : 'معلّق',
    createdAt: company.createdAt,
  }));
}



public async getPendingCompaniesWithCount() {
  // جلب الشركات المعلقة
  const companies = await this.companyRepository.find({
    where: { isVerified: false },
    select: [
      'id',
      'companyName',
      'email',
      'companyWebsite',
      'companyLocation',
      'companyLogo',
      'createdAt',
    ],
  });

  // عدّ الشركات المعلقة
  const pendingCount = companies.length;

  // تحويل البيانات للفرونت
  const data = companies.map((company) => ({
    id: company.id,
    companyName: company.companyName,
    email: company.email,
    website: company.companyWebsite || null,
    location: company.companyLocation || null,
    logo: company.companyLogo || null,
    createdAt: company.createdAt,
  }));

  return {
    totalPending: pendingCount,
    companies: data,
  };
}



public async searchCompanyByName(keyword: string): Promise<CompanyEntity[]> {
  const cleanKeyword = keyword?.trim();

  if (!cleanKeyword) {
    throw new NotFoundException('Search keyword cannot be empty');
  }

  const parts = cleanKeyword.split(' ').filter(Boolean);

  let qb = this.companyRepository.createQueryBuilder('company');

  parts.forEach((part, index) => {
    const param = `p${index}`;

    const condition = `
      (
        company.companyName ILIKE :${param}
        OR company.email ILIKE :${param}
        OR company.companyLocation ILIKE :${param}
        OR company.companyWebsite ILIKE :${param}
      )
    `;

    const params = { [param]: `%${part}%` };

    if (index === 0) {
      qb = qb.where(condition, params);
    } else {
      qb = qb.andWhere(condition, params);
    }
  });

  const companies = await qb.getMany();

  if (!companies.length) {
    throw new NotFoundException(`No companies found for "${keyword}"`);
  }


  const mappedCompanies = companies.map((company) => ({
    ...company,
    email:company.email,
    status: company.isVerified ? 'مقبول' : 'معلّق',
  }));

  return mappedCompanies;
}


async createCompany(
  dto: CreateCompanyManagementDto,
  logoPath?: string | null,
): Promise<CompanyEntity> {
  const existing = await this.companyRepository.findOne({ where: { email: dto.email } });
  if (existing) throw new ConflictException(`Company with ${dto.email} already exists`);
  const hashedPassword = await this.authService.hashPassword(dto.password);
  const newCompany = this.companyRepository.create({
    companyName: dto.companyName,
    companyWebsite: dto.companyWebsite,
    companyLocation: dto.companyLocation,
    email: dto.email,
    password: hashedPassword,
    companyLogo: logoPath ?? undefined,
    isVerified: true, 
  });

  const savedCompany = await this.companyRepository.save(newCompany);

  const { password, ...companyWithoutPassword } = savedCompany;

  return companyWithoutPassword as CompanyEntity;
}


public async getCompanyById(id: number): Promise<CompanyEntity> {
  const company = await this.companyRepository.findOne({
    where: { id },
    select: [
      'id',
      'companyName',
      'email',
      'companyWebsite',
      'companyLocation',
      'companyLogo',
      'isVerified',
      'createdAt',
    ],
  });

  if (!company) {
    throw new NotFoundException(`Company with id ${id} not found`);
  }

  return {
    ...company,
    status: company.isVerified ? 'مقبول' : 'معلّق',
  } as CompanyEntity;
}


public async getApplicantsForJob(jobId: number, companyId: number) {
  const job=await this.jobsRepository.findOne({
    where:{
      id:jobId,
    },
    relations: ['company'],
  })

  if(!job){
    throw new NotFoundException(`job with ${jobId} not found`)
  }

  if (job.company.id !== companyId) {
    throw new ForbiddenException(
      'You are not allowed to view applicants for this job',
    );
  }

  const Appicats= this.jobApplyRepository.find({
    where: {
      job: {
        id: jobId,
        company: { id: companyId },
      },
    },
    relations: ['user', 'resume', 'job'],
    order: {
      ranking_score: 'DESC',
    },
  });

  return Appicats
  
}


public async getResumePath(jobApplyId: number, companyId: number) {
  const application = await this.jobApplyRepository.findOne({
    where: { id: jobApplyId },
    relations: ['job', 'job.company', 'resume'],
  });

  if (!application) throw new NotFoundException('Application not found');

  if (application.job.company.id !== companyId) {
    throw new NotFoundException('Not allowed to view this resume');
  }

  const resumePath = application.resume.file_path;
  const fullPath = path.resolve(resumePath);

  if (!fs.existsSync(fullPath)) {
    throw new NotFoundException('Resume file not found');
  }

  return fullPath;
}
}
