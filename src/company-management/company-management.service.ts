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
<<<<<<< HEAD
import * as fs from 'fs';
import * as path from 'path';
=======
import { JobEntity } from 'src/jobs/entities/job.entity';
>>>>>>> cdd40215a041f12bc2d83baa25f403a37df75517

@Injectable()
export class CompanyManagementService {
  
  constructor(
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(JobEntity) private jobsRepository:Repository<JobEntity>,

    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,

    private readonly jwtService: JwtService,
  ) {}

  


  async RegisterAsCompany(createCompanyDto: CreateCompanyManagementDto, logoPath?: string) {
    const oldCompany = await this.companyRepository.findOne({
      where: { email: createCompanyDto.email },
    });

    if (oldCompany) {
      throw new ForbiddenException(`Company with ${oldCompany.email} is already registered`);
    }

    const hashedPassword = await this.authService.hashPassword(createCompanyDto.password);

    const newCompany = this.companyRepository.create({
      companyName: createCompanyDto.companyName,
      companyWebsite: createCompanyDto.companyWebsite,
      companyLocation: createCompanyDto.companyLocation,
      email: createCompanyDto.email,
      password: hashedPassword,
      companyLogo: logoPath ? logoPath : undefined,
    });

    const savedCompany = await this.companyRepository.save(newCompany);
    const { password, ...companyWithoutPassword } = savedCompany;
    const token = this.generateToken(savedCompany);

    return {
      company: companyWithoutPassword,
      ...token,
      message: `Welcome ${savedCompany.companyName} to our app`,
    };
  }

  async updateCompany(id: number, updateDto: UpdateCompanyManagementDto, logoPath?: string) {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (logoPath && company.companyLogo) {
      const oldLogoPath = path.join(process.cwd(), company.companyLogo);
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
      updateDto.companyLogo = logoPath;
    }

    Object.assign(company, updateDto);
    return this.companyRepository.save(company);
  }


  async LoginComapny(companyDto:LoginCompanyDto){
      const oldCompany=await this.companyRepository.findOne({
      where:{
        email:companyDto.email
      }
    })
      if(!oldCompany){
      throw new ForbiddenException(`company with ${companyDto.email} is not exit you have to register `)
    }
    const matchedpassword=await this.authService.verifyPassword(companyDto.password,oldCompany.password)
    if(!matchedpassword){
      throw new ForbiddenException('Invalid password');
    }
    const tokens = this.generateToken(oldCompany);
    const { password, ...userWithoutPassword } = oldCompany;
    return {
      user: userWithoutPassword,
      ...tokens,
    };
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

  public async getNumberofCompanyJobs(company:any):Promise<Number>{
    const companyjobs=await this.jobsRepository.count({
      where:{
          company: {
            id: company.id,
      }
      }
    })
    return companyjobs
  }

  public async numberofApplyForJobs(jobid:number,company:any){
    const job=await this.jobsRepository.findOne({
      where:{
        id:jobid
      },relations:['applications','company']
    })
    if(!job){
      throw new NotFoundException(`job not found`)
    }
    if (job.company.id!==company.id){
      throw new ForbiddenException(`you don't have the right `)
    }

    const jobWithApplications = await this.jobsRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.applications', 'application')
      .leftJoinAndSelect('application.user', 'user')
      .where('job.id = :jobId', { jobId: jobid })
      .orderBy('application.ranking_score', 'DESC')
      .getOne();

    return {
      applicants: jobWithApplications?.applications || [],
      totalApplicants: jobWithApplications?.applications.length || 0
    };

  }

  private generateToken(company: CompanyEntity) {
    return {
      accessToken: this.generateAccessToken(company),
      refreshToken: this.generateRefreshToken(company),
    };
  }

  private generateAccessToken(company: CompanyEntity): string {
    const payload = {
      sub: company.id,
      email: company.email,
      role: company.role,
    };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'jwt_secret',
      expiresIn: '15m',
    });
  }

  private generateRefreshToken(company: CompanyEntity): string {
    const payload = { sub: company.id };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      expiresIn: '7d',
    });
  }
}
