import { IsOptional, IsString } from 'class-validator';

export class SearchJobDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsString()
    jobType?: string;
}
