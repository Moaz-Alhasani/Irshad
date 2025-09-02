import { IsEnum, IsInt, IsNumber, IsOptional } from 'class-validator';
import { ApplicationStatus } from '../entities/jobApplyEntitt';

export class CreateJobApplyDto {
    
    @IsOptional()
    @IsEnum(ApplicationStatus)
    application_status?: ApplicationStatus;

    @IsOptional()
    @IsInt()
    estimated_salary?: number;

    @IsOptional()
    @IsNumber()
    similarity_score?: number;

    @IsOptional()
    @IsNumber()
    ranking_score?: number;
}
