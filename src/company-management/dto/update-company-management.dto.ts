import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyManagementDto } from './create-company-management.dto';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateCompanyManagementDto extends PartialType(CreateCompanyManagementDto) {


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
    
    @IsOptional()
    @IsString()
    companyLogo?: string;
}
