import {  IsArray, IsNotEmpty, IsString, ValidateIf } from 'class-validator';


export class ResumeDto{
    @IsNotEmpty()
    university:string

    @IsNotEmpty()
    location:string

    @IsNotEmpty()
    phone:string

    @IsNotEmpty()
    experience_years:number

    @IsNotEmpty()
    @ValidateIf(o => typeof o.languages === 'string' || Array.isArray(o.languages))
    @IsArray()
    @IsString({ each: true })
    languages: string[];
    
    @IsNotEmpty()
    @ValidateIf(o => typeof o.certifications === 'string' || Array.isArray(o.certifications))
    @IsArray()
    @IsString({ each: true })
    certifications: string[];

    @IsNotEmpty()
    @ValidateIf(o => typeof o.education === 'string' || Array.isArray(o.education))
    @IsArray()
    @IsString({ each: true })
    education: string[];

    @IsNotEmpty()
    @ValidateIf(o => typeof o.skills === 'string' || Array.isArray(o.skills))
    @IsArray()
    @IsString({ each: true })
    extracted_skills: string[];

    @IsNotEmpty()
    @IsString({ each: true })
    summary:string
}