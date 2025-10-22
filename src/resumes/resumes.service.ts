import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { ResumeEntity } from './entities/resume.entity';
import axios from 'axios';
import { existsSync, unlinkSync } from 'fs';
import { ResumeDto } from './dto/resume.dto';
import { UserEntity } from 'src/user/entities/user.entity';

interface FlaskResponse {
  parser_output?: {
    Skills?: string[];
    Education?: string[];
    Certifications?: string[];
    Languages?: string[];
  };
  ner_entities?: {
    PER?: string[];
    LOC?: string[];
    ORG?: string[];
    MISC?: string[];
  };
  email?: string;
  phone?: string;
  estimated_experience_years?: number;
  [key: string]: any;
}

@Injectable()
export class ResumesService {
  constructor(
    @InjectRepository(ResumeEntity)
    private resumeRepo: Repository<ResumeEntity>,
    @InjectRepository(UserEntity)
    private userEntity:Repository<UserEntity>
  ) {}

async sendToFlaskAndSave(filePath: string, userId: number) {
    try {
      const flaskResponse = await axios.post<FlaskResponse>(
        'http://localhost:5000/analyze',
        { file_path: filePath }
      );

      const data = flaskResponse.data;

      const combinedSkills = Array.from(
        new Set([
          ...(data.parser_output?.Skills || []),
          ...(data.ner_entities?.MISC || []),
        ])
      );

      const university = data.ner_entities?.ORG?.[0] || null;
      const location = data.ner_entities?.LOC?.[0] || null;

      const resume = this.resumeRepo.create({
        file_path: filePath,
        extracted_skills: combinedSkills,
        education: data.parser_output?.Education || [],
        certifications: data.parser_output?.Certifications || [],
        languages: data.parser_output?.Languages?.length
          ? data.parser_output.Languages
          : ['Arabic'],
        experience_years: data.estimated_experience_years || 0,
        phone: data.phone || null,
        university,
        location,
        user: { id: userId } as any,
      } as DeepPartial<ResumeEntity>);

      return await this.resumeRepo.save(resume);
    } catch (err: any) {
      console.error("Error sending to Flask:", err.message);
      throw err;
    }
  }


   async updateResume(id: number, newFilePath: string, userId: number) {
    const resume = await this.resumeRepo.findOne({ where: { id }, relations: ['user'] });
    if (!resume) throw new NotFoundException('Resume not found');
    if (resume.user.id !== userId) throw new ForbiddenException('Not your resume');
    if (existsSync(resume.file_path)) {
      unlinkSync(resume.file_path);
    }
    await this.resumeRepo.remove(resume);
    return this.sendToFlaskAndSave(newFilePath, userId);
  }

  async deleteResume(id: number, userId: number) {
    const resume = await this.resumeRepo.findOne({ where: { id }, relations: ['user'] });
    if (!resume) throw new NotFoundException('Resume not found');
    if (resume.user.id !== userId) throw new ForbiddenException('Not your resume');
    if (existsSync(resume.file_path)) {
      unlinkSync(resume.file_path);
    }
    await this.resumeRepo.remove(resume);
    return { success: true, message: 'Resume deleted successfully' };
  }

  async registerResume(currentuser:any,resumeDto:ResumeDto){

    const user=await this.userEntity.findOne({
      where:{
        id:currentuser.id
      }
    })

    if(!user){
      throw new ForbiddenException("user is not exist")
    }

    const normalizeArray = (field: string | string[]): string[] => 
        Array.isArray(field) ? field : [field];
    
    const resume = this.resumeRepo.create({
        user: currentuser.id,
        location: resumeDto.location,
        languages: normalizeArray(resumeDto.languages),
        experience_years: resumeDto.experience_years,
        extracted_skills: normalizeArray(resumeDto.skills),
        certifications: normalizeArray(resumeDto.certifications),
        education: normalizeArray(resumeDto.education),
        phone: resumeDto.phone,
        university: resumeDto.universtiy
    });

    await this.resumeRepo.save(resume)

    return resume
  
  }
}


