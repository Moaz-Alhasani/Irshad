import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity, UserRole } from './entities/user.entity';
import { RegisterDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { UpdateUserInfo } from './dto/update-user.dto';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { CompanyManagementService } from 'src/company-management/company-management.service';
import { retry } from 'rxjs';
import { JobsService } from 'src/jobs/jobs.service';
import axios from 'axios';
import Redis from 'ioredis';
import * as otpGenerator from 'otp-generator';
import { MailService } from './gobal/MailService';
import { CurrentUser } from './decorators/current_user.decorators';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ApplicationStatus, JobApplyEntity } from 'src/jobapply/entities/jobApplyEntitt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';


interface FlaskSimilarityResponse {
  jobId: number;
  score: number;
}

@Injectable()
export class AuthService {
    private otpStore: Record<
    string,
    { otp: string; expiresAt: Date }
    > = {};

    private resetTokens: Record<string, { email: string; expiresAt: number }> = {};

  constructor(
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
    private jwtService: JwtService,
    private ComapnyService:CompanyManagementService,
    private readonly jobsService: JobsService,
    @InjectRepository(CompanyEntity) private companyRepository:Repository<CompanyEntity>,
    private MailService:MailService,
    @InjectRepository(JobApplyEntity) private jobApplyRepository:Repository<JobApplyEntity>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async register(registerDto: RegisterDto,imagePath: string | null,fingerprint:string) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }
    registerDto.profileImage = imagePath ?? undefined;
    const hashedPassword = await this.hashPassword(registerDto.password);
    const newUser = this.userRepository.create({
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      email: registerDto.email,
      password: hashedPassword,
      role: registerDto.role || UserRole.JOB_SEEKER,
      profileImage: registerDto.profileImage ,
      birthDate: new Date(registerDto.birthDate),
    });

    const savedUser = await this.userRepository.save(newUser);
    await this.sendOtp(newUser.email)
    const { password, ...userWithoutPassword } = savedUser;
    const tokens = this.generateToken(savedUser,fingerprint);
    return {
      user: userWithoutPassword,
      ...tokens,
      message: 'Registration successful',
    };
  }

  async createAdmin(registerDto: RegisterDto,fingerprint:string) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }
    const hashedPassword = await this.hashPassword(registerDto.password);
    const newUser = this.userRepository.create({
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      email: registerDto.email,
      password: hashedPassword,
      role: UserRole.ADMIN,
      isActive:true,
      isVerify:true
    });
    const savedUser = await this.userRepository.save(newUser);
    const { password, ...userWithoutPassword } = savedUser;
    const tokens = this.generateToken(savedUser,fingerprint);
    return {
      user: userWithoutPassword,
      ...tokens,
      message: 'Admin registration successful',
    };
  }

  async createSuperAdmin(registerDto: RegisterDto,fingerprint:string) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }
    const hashedPassword = await this.hashPassword(registerDto.password);
    const newUser = this.userRepository.create({
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      email: registerDto.email,
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
    });
    const savedUser = await this.userRepository.save(newUser);
    const { password, ...userWithoutPassword } = savedUser;
    const tokens = this.generateToken(savedUser,fingerprint);
    return {
      user: userWithoutPassword,
      ...tokens,
      message: 'Admin registration successful',
    };
  }


  // async login(loginDto: LoginDto,fingerprint:string) {
  //   const user = await this.userRepository.findOne({
  //     where: { email: loginDto.email },
  //   });
  //   if (!user) {
  //     throw new UnauthorizedException('Invalid credentials');
  //   }
  //   const isPasswordValid = await this.verifyPassword(
  //     loginDto.password,
  //     user.password,
  //   );
  //   if (!isPasswordValid) {
  //     throw new UnauthorizedException('Invalid credentials');
  //   }
  //   // if (!user.isActive){
  //   //   throw new UnauthorizedException('Your account is deactivated. Please contact support.');
  //   // }
  //   // if (!user.isVerify){
  //   //   throw new UnauthorizedException('Your account is deactivated. Please contact support.');
  //   // }
  //   const tokens = this.generateToken(user,fingerprint);
  //   const { password, ...userWithoutPassword } = user;
  //   return {
  //     user: userWithoutPassword,
  //     ...tokens,
  //   };
  // }

  async login(loginDto: LoginDto, fingerprint: string) {
  // أولاً: البحث في المستخدمين
  const user = await this.userRepository.findOne({
    where: { email: loginDto.email },
  });

  if (user) {
    const isPasswordValid = await this.verifyPassword(
      loginDto.password,
      user.password,
    );
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive){
      throw new UnauthorizedException('Your account is deactivated. Please contact support.');
    }
    if (!user.isVerify){
      throw new UnauthorizedException('Your account is deactivated. Please contact support.');
    }
    
    const tokens = this.generateToken(user, fingerprint);
    const { password, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      type: 'user',
    };
  }

  // إذا لم يكن مستخدم، البحث في الشركات
  const company = await this.companyRepository.findOne({
    where: { email: loginDto.email },
  });

  if (company) {
    const isPasswordValid = await this.verifyPassword(
      loginDto.password,
      company.password,
    );
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.generateToken(company, fingerprint);
    const { password, ...companyWithoutPassword } = company;
    
    return {
      company: companyWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      type: 'company',
    };
  }

  // إذا لم يتم العثور على أي منهما
  throw new UnauthorizedException('Invalid credentials');
}



  async refreshToken(refreshToken: string,fingerprint:string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      const accessToken = this.generateAccessToken(user,fingerprint);
      return { accessToken };
    } catch (error) {
      throw new ForbiddenException('Invalid or expired refresh token');
    }
  }

  async getUserById(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found!');
    }

    const { password, ...result } = user;
    return result;
  }


  async updateUser(id: number, updateUserInfo: UpdateUserInfo, imagePath?: string) {
  const user = await this.userRepository.findOne({ where: { id } });
  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (updateUserInfo.password) {
    updateUserInfo.password = await bcrypt.hash(updateUserInfo.password, 10);
  }

  // تحديث الصورة الشخصية إذا كانت هناك صورة جديدة
  if (imagePath) {
    // حذف الصورة القديمة إذا كانت موجودة
    if (user.profileImage) {
      const oldImagePath = path.join(process.cwd(), user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    // تعيين المسار الجديد للصورة
    updateUserInfo.profileImage = imagePath;
  }

  Object.assign(user, updateUserInfo);
  return this.userRepository.save(user);
}


  async deleteUser(id: number) {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
    return { message: 'User deleted successfully' };
  }

  async AdminAcceptTheCompany(compid:number){
    const company=await this.companyRepository.findOne({where:{id:compid}})
    if(!company){
      throw new NotFoundException(`company with ${compid} id is not found`)
    }
    company.isVerified=true
      await this.MailService.sendEmail({
      email: company.email,
      subject: 'Company Application Approved',
      message: `
      Dear ${company.companyName},
      Your company has been approved.
      Welcome to Irshad.
      Irshad Team
      `
    });
    return this.companyRepository.save(company)
  }

async AdminNonAcceptTheCompany(compid:number){
  const company=await this.companyRepository.findOne({where:{id:compid}})
  if(!company){
    throw new NotFoundException(`company with ${compid} id is not found`)
  }

  company.isVerified = false; 
  await this.MailService.sendEmail({
    email: company.email,
    subject: 'Company Application Rejected',
    message: `
      Dear ${company.companyName},
      Your company application was not approved.
      You may apply again later.
      Irshad Team`
  });

  return this.companyRepository.save(company);
}


async AdminDeleteTheCompany(compid:number){
  const company=await this.companyRepository.findOne({where:{id:compid}})
  if(!company){
    throw new NotFoundException(`company with ${compid} id is not found`)
  }
  await this.MailService.sendEmail({
    email: company.email,
    subject: 'Company Application Rejected',
    message: `
      Dear ${company.companyName},
      Your company application was not approved.
      You may apply again later.
      Irshad Team`
  });
  this.companyRepository.delete(compid)

  return this.companyRepository.save(company);
}

  async getUserWithResume(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['resumes'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }



 async getRecommendedJobs(userId: number) {
  const cacheKey = `recommended_jobs_user_  ${userId}`;
  console.log('Cache Key:', cacheKey);
  // 1️⃣ حاول قراءة البيانات من الكاش أولًا
  const cachedJobs = await this.cacheManager.get<any[]>(cacheKey);
  if (cachedJobs !== undefined && cachedJobs !== null) {
    // إذا كان هناك بيانات حتى لو كانت [] يتم إرجاعها مباشرة
    return cachedJobs;
  }

  // 2️⃣ جلب بيانات المستخدم
  const user = await this.userRepository.findOne({
    where: { id: userId },
    relations: ['resumes'],
  });

  if (!user) throw new NotFoundException('User not found');
  if (!user.resumes || user.resumes.length === 0)
    throw new ForbiddenException('User does not have any resumes');

  const resume = user.resumes[0];

  // 3️⃣ تجهيز نص السيرة الذاتية للفلترة
  const resumeText = [
    ...new Set([
      ...(resume.extracted_skills || []),
      ...(resume.education || []),
      resume.experience_years
        ? `Experience: ${resume.experience_years} years`
        : '',
      resume.summary || '',
    ]),
  ].join(' ');

  // 4️⃣ جلب كل الوظائف
  const allJobs = await this.jobsService.getAllJobs();

  // 5️⃣ إذا لا توجد وظائف أصلًا، خزّن [] في الكاش لفترة قصيرة وأعد []
  if (!allJobs || allJobs.length === 0) {
    await this.cacheManager.set(cacheKey, [], 60 * 2); // TTL قصير
    return [];
  }

  const jobsPayload = allJobs.map(job => ({
    id: job.id,
    title: job.title,
    description: job.description,
    requiredSkills: job.requiredSkills || [],
    requiredEducation: job.requiredEducation || [],
    requiredExperience: job.requiredExperience || 0,
  }));

  // 6️⃣ طلب الفلاسك لحساب التشابه
  const flaskRes = await axios.post<{ jobId: number; score: number }[]>(
    'http://localhost:5000/get-similarity',
    {
      resume_text: resumeText,
      jobs: jobsPayload,
    }
  );

  // 7️⃣ فرز الوظائف حسب التشابه وإزالة العناصر غير الموجودة
  const sortedJobs = flaskRes.data
    .sort((a, b) => b.score - a.score)
    .map(item => {
      const job = allJobs.find(j => j.id === item.jobId);
      return job ? { ...job, similarityScore: item.score } : null;
    })
    .filter(Boolean);

  // 8️⃣ تخزين النتيجة في الكاش
  await this.cacheManager.set(
    cacheKey,
    sortedJobs,
    sortedJobs.length ? 60 * 10 : 60 * 3 // 10 دقائق إذا توجد وظائف، 3 دقائق إذا فارغة
  );

  return sortedJobs;
}

 


  // the settings for user 
  // updateUserStatus 
async undisable(userId: number) {
  const user = await this.userRepository.findOne({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (!user.isVerify) {
    throw new BadRequestException('Unverified user cannot be activated');
  }

  user.isActive = true;
  await this.userRepository.save(user);

  return { message: 'The active user has been activated' };
}

  async disable (userId :number){
    const user = await this.userRepository.findOne({
      where:{id:userId}
    })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    user.isActive = false;
    this.userRepository.save(user);
  }


  private generateToken(user: any,fingerprint:string) {
    return {
      accessToken: this.generateAccessToken(user,fingerprint),
      refreshToken: this.generateRefreshToken(user,fingerprint),
    };
  }
 
  private generateAccessToken(user: UserEntity,fingerprint: string): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fingerprint
    }; 
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'jwt_secret',
      expiresIn: '15m',
    });
  } 

  private generateRefreshToken(user: UserEntity,fingerprint: string): string {
    const payload = { sub: user.id , fingerprint};
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      expiresIn: '7d',
    });
  }

  public async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  public async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }


public async sendOtp(userEmail: string) {
    const otp = otpGenerator.generate(5, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      digits: true,
      specialChars: false,
    });
    this.otpStore[userEmail] = {
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), 
    };

    console.log('OTP generated and stored:', otp);

    await this.MailService.sendEmail({
      email: userEmail,
      subject: 'Your OTP Code',
      message: `Your OTP code is: ${otp}`,
    });

    return { message: 'OTP sent to your email' };
  }


  public async forgetPassword(userEmail: string) {
    const user = await this.userRepository.findOne({ where: { email: userEmail } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }
    return await this.sendOtp(userEmail);
  }

  public async verifyOtpForPassword(otp: string) {
    const userEmail = Object.keys(this.otpStore).find(
      email => this.otpStore[email]?.otp === otp,
    );
    if (!userEmail) {
      return { success: false, message: 'Invalid OTP' };
    }
    const checkOtp = this.verifyOtp(userEmail, otp);
    if (checkOtp.success) {
      const resetToken = uuidv4();
      const expiresAt = Date.now() + 15 * 60 * 1000; 

      this.resetTokens[resetToken] = { email: userEmail, expiresAt };
      return {
        success: true,
        message: 'OTP verified, you can now reset your password',
        resetToken,
      };
    }
    return checkOtp;
  }

  public async updatePassword(newPassword: string, resetToken: string) {
    const tokenRecord = this.resetTokens[resetToken];
    if (!tokenRecord || tokenRecord.expiresAt < Date.now()) {
      throw new ForbiddenException('Invalid or expired reset token');
    }
    const userEmail = tokenRecord.email;
    const user = await this.userRepository.findOne({ where: { email: userEmail } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }
    const hashedPassword = await this.hashPassword(newPassword);
    user.password = hashedPassword;
    await this.userRepository.save(user);
    delete this.resetTokens[resetToken];
    return { success: true, message: 'Password updated successfully' };
  }



  public verifyOtp(userEmail: string, otp: string) {
    const record = this.otpStore[userEmail];
    if (!record) {
      return { success: false, message: 'OTP not found' };
    }
    const now = new Date();
    if (record.expiresAt < now) {
      delete this.otpStore[userEmail];
      return { success: false, message: 'OTP expired' };
    }
    if (record.otp === otp) {
      delete this.otpStore[userEmail];
      return { success: true, message: 'OTP verified' };
    }
    return { success: false, message: 'Invalid OTP' };
  }

 public async verifyOtpForEmail(userEmail: string, otp: string,fingerprint:string) {
  const checkOtp = this.verifyOtp(userEmail, otp);

  if (!checkOtp.success) {
    return { success: false, message: checkOtp.message };
  }

  const user = await this.userRepository.findOne({ where: { email: userEmail } });
  if (!user) throw new ForbiddenException('User not found');

  user.isVerify = true;
  await this.userRepository.save(user);

  const tokens = this.generateToken(user,fingerprint);

  return {
    success: true,
    message: 'OTP verified. User activated and tokens generated.',
    tokens,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
    },
  };
}

public async resendOtp(userEmail: string, fingerprint?: string) {
  const user = await this.userRepository.findOne({
    where: { email: userEmail },
  });
  console.log(user);
  
  console.log(userEmail,"s");
  
  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (user.isVerify) {
    throw new BadRequestException('Account already verified');
  }
  await this.sendOtp(userEmail);
  const accessToken = this.generateAccessToken(user, fingerprint || 'temp');

  return {
    message: 'OTP resent successfully',
    tempToken: accessToken,
  };
}

  public async resendPasswordOtp(email: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.sendOtp(email);

    return 'OTP resent successfully. Check your email.';
  }



  public async searchUserByName(username: string): Promise<UserEntity[]> {
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      throw new NotFoundException('Username cannot be empty');
    }

    const parts = cleanUsername.split(' ').filter(Boolean);

    let qb = this.userRepository.createQueryBuilder('user');

    parts.forEach((part, idx) => {
      const paramName = `p${idx}`;
      const condition = `(user.firstName ILIKE :${paramName} OR user.lastName ILIKE :${paramName} OR user.email ILIKE :${paramName})`;
      const params = { [paramName]: `%${part}%` };

      if (idx === 0) qb = qb.where(condition, params);
      else qb = qb.andWhere(condition, params);
    });

    const users = await qb.getMany();

    if (!users || users.length === 0) {
      throw new NotFoundException(`${username} is not exist`);
    }

    return users;
  }


  public async getAllUsers(): Promise<any[]> {
    const users = await this.userRepository.find();

    return users.map(user => ({
      id: user.id,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: this.mapRoleToLabel(user.role),
      isActive: user.isActive,
      createdAt: user.createdAt,
    }));
  }

  private mapRoleToLabel(role: UserRole): string {
    switch(role) {
      case UserRole.SUPER_ADMIN: return 'مدير عام';
      case UserRole.ADMIN: return 'أدمن';
      case UserRole.JOB_SEEKER: return 'مستخدم';
      default: return 'غير معروف';
    }
  }

  public async getUsersByRole(role?: UserRole): Promise<any[]> {
const users = await this.userRepository.find();
const mappedUsers = users.map(u => ({
  id: u.id,
  fullName: `${u.firstName} ${u.lastName}`,
  email: u.email,
  role: u.role,
  roleLabel: u.role === 'super_admin' ? 'مدير عام' : u.role === 'admin' ? 'أدمن' : 'مستخدم',
  isActive: u.isActive,
  isVerify: u.isVerify,
  status: !u.isVerify ? 'pending' : u.isActive ? 'active' : 'suspended',
  createdAt: u.createdAt
}));
return mappedUsers;
}






  public async numberOfUsers(): Promise<number> {
    return await this.userRepository.count({
      where: { role: UserRole.JOB_SEEKER },
    });
  }

  public async numberOfAdmins(): Promise<number> {
  return await this.userRepository.count({
    where: [
      { role: UserRole.ADMIN },
      { role: UserRole.SUPER_ADMIN },
    ],
  });
}

public async getUserWhoVerifyTrue(): Promise<number> {
  const userVerify = await this.userRepository.count({
    where: {
      isVerify: true,
    },
  });

  return userVerify;
}

public async getUserWhoVerifyFalse(): Promise<number> {
  const userNotVerify = await this.userRepository.count({
    where: {
      isVerify: false,
    },
  });

  return userNotVerify;
}

public async getAcceptedApplications(userId: number) {
  const applications = await this.jobApplyRepository.find({
    where: {
      user: { id: userId },
      application_status: ApplicationStatus.ACCEPTED,
    },
    relations: [
      'job',
      'job.company',
      'interviews',
    ],
    order: {
      interviews: {
        createdAt: 'DESC', 
      },
    },
  });

  return applications.map(app => ({
    id: app.job.id,
    title: app.job.title,
    type: app.job.employmentType?.toUpperCase(),
    location: app.job.location,
    companyName: app.job.company.companyName,
    description: app.job.description,
    skills: app.job.requiredSkills.join(', '),
    experience: app.job.requiredExperience
      ? `${app.job.requiredExperience}+ years`
      : null,
    education: JSON.stringify(app.job.requiredEducation),
    hasTest: app.job.questions && app.job.questions.length > 0,
    employmentType: app.job.employmentType,
    image: app.job.image,
    createdAt: app.job.createdAt,

    interview: app.interviews?.length
      ? {
          date: app.interviews[0].interviewDate,
          time: app.interviews[0].interviewTime,
          notes: app.interviews[0].additionalNotes,
          meetingUrl: app.interviews[0].meetingUrl,
        }
      : null,
  }));
}


public async getRejectedApplications(userId: number) {
  const applications = await this.jobApplyRepository.find({
    where: {
      user: { id: userId },
      application_status: ApplicationStatus.REJECTED,
    },
    relations: ['job', 'job.company'],
  });
   return applications.map(app => ({
    id: app.job.id,
    title: app.job.title,
    type: app.job.employmentType?.toUpperCase(),
    location: app.job.location,
    companyName: app.job.company.companyName,
    description: app.job.description,
    skills: app.job.requiredSkills.join(', '),
    experience: app.job.requiredExperience
      ? `${app.job.requiredExperience}+ years`
      : null,
    education: JSON.stringify(app.job.requiredEducation),
    hasTest: app.job.questions && app.job.questions.length > 0,
    employmentType: app.job.employmentType,
    image: app.job.image,
    createdAt: app.job.createdAt,
  }));

}

public async getPendingApplications(userId: number) {
  const applications = await this.jobApplyRepository.find({
    where: {
      user: { id: userId },
      application_status: ApplicationStatus.PENDING,
    },
    relations: ['job', 'job.company'],
  });
    return applications.map(app => ({
    id: app.job.id,
    title: app.job.title,
    type: app.job.employmentType?.toUpperCase(),
    location: app.job.location,
    companyName: app.job.company.companyName,
    description: app.job.description,
    skills: app.job.requiredSkills.join(', '),
    experience: app.job.requiredExperience
      ? `${app.job.requiredExperience}+ years`
      : null,
    education: JSON.stringify(app.job.requiredEducation),
    hasTest: app.job.questions && app.job.questions.length > 0,
    employmentType: app.job.employmentType,
    image: app.job.image,
    createdAt: app.job.createdAt,
  }));
}

}
