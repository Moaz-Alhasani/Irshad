import { BadRequestException, ConflictException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
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
import { MailService } from '../user/gobal/MailService';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';


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
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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
  const cacheKey = `company_jobs_${companyId}`;
  const cachedJobs = await this.cacheManager.get<any[]>(cacheKey);
  if (cachedJobs !== undefined && cachedJobs !== null) {
    return cachedJobs;
  }
  const company = await this.companyRepository.findOne({ 
    where: { id: companyId }, 
    relations: ['jobs'] 
  });
  if (!company) throw new NotFoundException('Company not found');
  const jobs = company.jobs || [];
  await this.cacheManager.set(cacheKey, jobs, jobs.length ? 60 * 10 : 60 * 3);

  return jobs;
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
    console.log(ApplicationStatus.ACCEPTED);
    
    await this.jobApplyRepository.save(jobApplication);

    return { message: 'User application accepted', application: jobApplication };
  }

// async rejectTheUseraftertheinterviewservice(userId: number,feedback: string,) {
//   const jobApplication = await this.jobApplyRepository.findOne({
//     where: {
//       user: { id: userId },
//       application_status: ApplicationStatus.PENDING,
//     },
//     relations: ['user', 'job', 'job.company'],
//   });

//   if (!jobApplication)
//     throw new NotFoundException('No pending application found for this user.');

  
//   jobApplication.application_status = ApplicationStatus.REJECTED;
//   jobApplication.rejectionFeedback = feedback;

//   await this.jobApplyRepository.save(jobApplication);

//   await this.mailService.sendEmail({
//     email: jobApplication.user.email,
//     subject: 'Job Application Update',
//     message: `
//         Dear ${jobApplication.user.firstName} ${jobApplication.user.lastName},

//         Thank you for attending the interview for the position:
//         "${jobApplication.job.title}"

//         After careful consideration, we regret to inform you that you were not selected for this role.

//         Feedback from the company:
//         "${feedback}"

//         We appreciate your time and encourage you to apply again in the future.

//         Best regards,
//         ${jobApplication.job.company.companyName}
//         Irshad Platform Team
//         `,
//     });

//   return {
//     message: 'User application rejected and feedback email sent successfully',
//   };
// }
async rejectTheUserAfterTheInterviewService(
  userId: number, 
  jobId: number, 
  feedback: string
) {

  const job = await this.jobsRepository.findOne({
    where: { id: jobId },
    relations: ['company'],
  });

  if (!job) {
    throw new NotFoundException(`Job with ID ${jobId} not found.`);
  }


  const jobApplication = await this.jobApplyRepository.findOne({
    where: {
      user: { id: userId },
      job: { id: jobId },
      application_status: ApplicationStatus.PENDING,
    },
    relations: ['user', 'job', 'job.company'],
  });

  if (!jobApplication) {

    const existingApplication = await this.jobApplyRepository.findOne({
      where: {
        user: { id: userId },
        job: { id: jobId },
      },
    });

    if (existingApplication) {
      throw new BadRequestException(
        `User's application for job ${jobId} is already ${existingApplication.application_status}.`
      );
    } else {
      throw new NotFoundException(
        `User ${userId} has not applied for job ${jobId}.`
      );
    }
  }
  jobApplication.application_status = ApplicationStatus.REJECTED;
  jobApplication.rejectionFeedback = feedback;

  await this.jobApplyRepository.save(jobApplication);


  await this.mailService.sendEmail({
    email: jobApplication.user.email,
    subject: `Interview Result - ${jobApplication.job.title}`,
    message: `
      Dear ${jobApplication.user.firstName} ${jobApplication.user.lastName},

      Thank you for taking the time to interview for the position:
      "${jobApplication.job.title}" at ${jobApplication.job.company.companyName}

      After careful consideration, we regret to inform you that you were not selected for this role.

      Feedback from the interviewer:
      "${feedback}"

      We appreciate your interest in our company and encourage you to apply for future positions that match your skills.

      Best regards,
      ${jobApplication.job.company.companyName}
      Irshad Platform Team
      ${jobApplication.job.company.email || ''}
    `,
  });

  return {
    success: true,
    message: 'User application rejected and feedback email sent successfully',
    data: {
      applicationId: jobApplication.id,
      userId: userId,
      jobId: jobId,
      jobTitle: jobApplication.job.title,
      companyName: jobApplication.job.company.companyName,
      feedback: feedback,
      rejectedAt: new Date(),
    },
  };
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

  const pendingCount = companies.length;


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
    relations: ['user', 'resume', 'job',"interviews"],
    order: {
      ranking_score: 'DESC',
    },
  });

  return Appicats
  
}


// public async getResumePath(jobId: number, userId: number, companyId: number) {
//   // التحقق من وجود التقديم للوظيفة المحددة من قبل هذا المستخدم
//   const jobApplication = await this.jobApplyRepository.findOne({
//     where: {
//       // user: { id: userId },
//       job: { id: jobId },
//       // application_status: ApplicationStatus.PENDING,
//     },
//     relations: ['job', 'job.company', 'resume'],
//   });
//   console.log(jobApplication);
  
//   if (!jobApplication) {
//     throw new NotFoundException('Application not found');
//   }

//   // التحقق أن الشركة المالكة للوظيفة هي نفسها الشركة الحالية
//   if (jobApplication.job.company.id !== companyId) {
//     throw new NotFoundException('Not allowed to view this resume');
//   }

//   const resumePath = jobApplication.resume.file_path; 
// // مثال: "C:/Users/LENOVO/Desktop/full project/Irshad/uploads/cv/1764865210310-681201610.pdf"

// // نبحث عن كلمة "uploads" ونأخذ ما بعدها
//   const index = resumePath.indexOf('uploads');
//   if (index === -1) {
//     throw new NotFoundException('Invalid resume path');
//   }

//   // نعيد المسار النسبي ابتداءً من uploads
//   const publicPath = '/' + resumePath.substring(index).replace(/\\/g, '/');

//   return  publicPath ;
// }


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

  const index = resumePath.indexOf('uploads');
  if (index === -1) {
    throw new NotFoundException('Invalid resume path');
  }

  const publicPath = '/' + resumePath.substring(index).replace(/\\/g, '/');

  return  publicPath ;
  
}


  async getCompanyProfile(id: number): Promise<any> {
    const company = await this.companyRepository.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'companyName',
        'companyWebsite',
        'companyLocation',
        'companyLogo',
        'isVerified',
        'role',
        'createdAt'
      ]
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }


}
