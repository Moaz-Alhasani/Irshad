import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCompanyManagementDto {
  @IsEmail({}, { message: 'email must be an email' })
  @IsNotEmpty({ message: 'email should not be empty' })
  email: string;

  @IsString({ message: 'password must be a string' })
  @IsNotEmpty({ message: 'password should not be empty' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsString({ message: 'companyName must be a string' })
  @IsNotEmpty({ message: 'companyName should not be empty' })
  companyName: string;

  @IsOptional()
  @IsString()
  companyWebsite?: string;

  @IsOptional()
  @IsString()
  companyLocation?: string;
}
