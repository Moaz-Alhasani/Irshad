import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Inject,
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
    private MailService:MailService
  ) {}

  async register(registerDto: RegisterDto,imagePath: string | null) {
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
      role: registerDto.role || UserRole.JOB_SEEKER,
      profileImage: registerDto.profileImage ,
    });

    const savedUser = await this.userRepository.save(newUser);
    await this.sendOtp(newUser.email)
    const { password, ...userWithoutPassword } = savedUser;
    const tokens = this.generateToken(savedUser);
    return {
      user: userWithoutPassword,
      ...tokens,
      message: 'Registration successful',
    };
  }

  async createAdmin(registerDto: RegisterDto) {
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
    });
    const savedUser = await this.userRepository.save(newUser);
    const { password, ...userWithoutPassword } = savedUser;
    const tokens = this.generateToken(savedUser);
    return {
      user: userWithoutPassword,
      ...tokens,
      message: 'Admin registration successful',
    };
  }

  async createSuperAdmin(registerDto: RegisterDto) {
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
    const tokens = this.generateToken(savedUser);
    return {
      user: userWithoutPassword,
      ...tokens,
      message: 'Admin registration successful',
    };
  }


  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await this.verifyPassword(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = this.generateToken(user);
    const { password, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }
  
  async refreshToken(refreshToken: string) {
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
      const accessToken = this.generateAccessToken(user);
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

    // remover the old image if there is new one 
    if (imagePath && user.profileImage) {
      const oldImagePath = path.join(process.cwd(), user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
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
    return this.companyRepository.save(company)
  }
  async AdminNonAcceptTheCompany(compid:number){
    const company=await this.companyRepository.findOne({where:{id:compid}})
    if(!company){
      throw new NotFoundException(`company with ${compid} id is not found`)
    }
    await this.companyRepository.remove(company);
    return `the company with ${compid} has been refused`
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
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['resumes'],
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.resumes || user.resumes.length === 0) {
      throw new ForbiddenException('User does not have any resume embeddings');
    }
    const resumeEmbedding: number[] = user.resumes[0].embedding;
    console.log("Resume embedding:", resumeEmbedding);
    const allJobs = await this.jobsService.getAllJobsWithEmbedding();
    console.log("All jobs embeddings:", allJobs.map(j => j.embedding));
    const flaskRes = await axios.post<FlaskSimilarityResponse[]>(
      'http://localhost:5000/get-similarity',
      {
        resume_embedding: resumeEmbedding,
        jobs: allJobs.map(job => ({ id: job.id, embedding: job.embedding })),
      }
    );
    console.log("Sending to Flask:", {
    resume_embedding: resumeEmbedding,
    jobs: allJobs.map(job => ({ id: job.id, embedding: job.embedding })),
  });
    const sortedJobs = flaskRes.data
      .sort((a, b) => b.score - a.score)
      .map(item => {  
        const job = allJobs.find(j => j.id === item.jobId);
        return {
          ...job,
          similarityScore: item.score,
        };
      });
    console.log("Sorted Recommended Jobs:", sortedJobs);
    return sortedJobs;
  }


  // the settings for user 
  // updateUserStatus 
  async undisable (userId :number){
    const user = await this.userRepository.findOne({
      where:{id:userId}
    })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    user.isActive = true;
    this.userRepository.save(user);
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


  private generateToken(user: UserEntity) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  private generateAccessToken(user: UserEntity): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'jwt_secret',
      expiresIn: '15m',
    });
  }

  private generateRefreshToken(user: UserEntity): string {
    const payload = { sub: user.id };
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
    const otp = otpGenerator.generate(6, {
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

  public async verifyOtpForEmail(userEmail: string, otp: string) {
    const checkOtp = this.verifyOtp(userEmail, otp);
    if (checkOtp.success) {
      const user = await this.userRepository.findOne({ where: { email: userEmail } });
      if (!user) {
        throw new ForbiddenException('User not found');
      }
      user.isVerify = true;
      await this.userRepository.save(user);
      return { success: true, message: 'OTP verified and user updated' };
    }
    return checkOtp; 
  }

public async SearchOfUser(username: string): Promise<UserEntity> {
  const cleanUsername = username.trim().replace(/['"]+/g, '');
  const parts = cleanUsername.split(' ').filter(Boolean);
  let user: UserEntity | null = null;

  if (parts.length === 2) {
    const [firstName, lastName] = parts;

    user = await this.userRepository.findOne({
      where: {
        firstName: ILike(`%${firstName}%`),
        lastName: ILike(`%${lastName}%`),
      },
    });
  } else {
    user = await this.userRepository.findOne({
      where: [
        { firstName: ILike(`%${cleanUsername}%`) },
        { lastName: ILike(`%${cleanUsername}%`) },
      ],
    });
  }

  if (!user) {
    throw new NotFoundException(`${username} is not exist`);
  }

  return user;
}


  public async resendOtp(userEmail: string) {
    return this.sendOtp(userEmail);
  }
}
