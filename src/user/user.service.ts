import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity, UserRole } from './entities/user.entity';
import { RegisterDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { UpdateUserInfo } from './dto/update-user.dto';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { CompanyManagementService } from 'src/company-management/company-management.service';
import { retry } from 'rxjs';



@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
    private jwtService: JwtService,
    private ComapnyService:CompanyManagementService,
    @InjectRepository(CompanyEntity) private companyRepository:Repository<CompanyEntity>
  ) {}

  async register(registerDto: RegisterDto) {
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
    });
    const savedUser = await this.userRepository.save(newUser);
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

 async updateUser(id: number, updateUserInfo: UpdateUserInfo) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (updateUserInfo.password) {
      updateUserInfo.password = await bcrypt.hash(updateUserInfo.password, 10);
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

  private async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }
}
