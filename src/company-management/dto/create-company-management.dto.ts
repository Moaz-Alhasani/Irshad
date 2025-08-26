import { IsString, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreateCompanyManagementDto {
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
