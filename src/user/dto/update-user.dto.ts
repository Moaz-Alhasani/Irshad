import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateUserInfo {
  @IsOptional()
  @IsNotEmpty()
  firstName?: string;

  @IsOptional()
  @IsNotEmpty()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
