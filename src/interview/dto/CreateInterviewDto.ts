import { IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateInterviewDto {
    @IsDateString()
    @IsNotEmpty()
    interviewDate: string;

    @IsString()
    @IsNotEmpty()
    interviewTime: string;

    @IsString()
    @IsOptional()
    meetingUrl?: string;

    @IsString()
    @IsOptional()
    additionalNotes?: string;
}
