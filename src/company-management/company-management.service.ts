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

@Injectable()
export class CompanyManagementService {
  
  constructor(
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,

    private readonly jwtService: JwtService,
  ) {}



  

  async RegisterAsCompany(createCompanyDto: CreateCompanyManagementDto) {
    const oldCompany=await this.companyRepository.findOne({
      where:{
        email:createCompanyDto.email
      }
    })
    if(oldCompany){
      throw new ForbiddenException(`company with ${oldCompany.email} is already register`)
    }
    const hashedpassword=await this.authService.hashPassword(createCompanyDto.password);
    const NewCompany=await this.companyRepository.create({
        companyName:createCompanyDto.companyName,
        companyWebsite:createCompanyDto.companyWebsite,
        companyLocation:createCompanyDto.companyLocation,
        email:createCompanyDto.email,
        password:hashedpassword,
    })
    
    const savedCompany=await this.companyRepository.save(NewCompany)
    const {password,...CompanyWithOutPassword}=savedCompany
    const token= this.generateToken(savedCompany);
    return {
      company: CompanyWithOutPassword,
      ...token,
      message:`Welcome ${savedCompany.companyName} to our app`
  };
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
