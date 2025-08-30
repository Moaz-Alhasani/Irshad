import { IsString, IsOptional, IsBoolean, IsNotEmpty, MinLength, IsEmail } from 'class-validator';

export class CreateCompanyManagementDto {
  
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
  
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  companyWebsite?: string;

  @IsOptional()
  @IsString()
  companyLocation?: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

}
