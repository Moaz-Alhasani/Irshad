import { ForbiddenException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { ResumeEntity } from './entities/resume.entity';
import axios from 'axios';
import { existsSync, unlinkSync } from 'fs';
import { ResumeDto } from './dto/resume.dto';
import { UserEntity } from 'src/user/entities/user.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';

interface ParserOutput {
  summary?: string;
  full_name?: string;
  skills?: string[];
  education?: {
    degree?: string;
    university?: string;
    major?: string;
  };
  experience_years?: number;
  location?: string;
  certifications?: string[];
  languages?: string[];
}

interface FlaskResponse {
  parser_output: ParserOutput;
  email?: string;
  phone?: string;
  estimated_experience_years?: number;
}


@Injectable()
export class ResumesService {
  constructor(
    @InjectRepository(ResumeEntity)
    private resumeRepo: Repository<ResumeEntity>,
    @InjectRepository(UserEntity)
    private userEntity:Repository<UserEntity>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

async sendToFlaskAndSave(filePath: string, userId: number) {
  try {

     const existingResume = await this.resumeRepo.findOne({
        where: { user: { id: userId } },
      });

      if (existingResume) {
        if (existsSync(filePath)) unlinkSync(filePath);
          throw new ForbiddenException(
            'You have already uploaded a resume.',
          );
      }
    console.log('Sending to Flask...', { filePath, userId });

    const flaskResponse = await axios.post<FlaskResponse>(
      'http://localhost:5000/analyze', 
      { file_path: filePath },
      { timeout: 30000 } 
    );

    console.log('Flask response status:', flaskResponse.status);
    console.log('Flask response data:', JSON.stringify(flaskResponse.data, null, 2));

    const data = flaskResponse.data;
    const parser = data.parser_output || {};

    console.log(' Parsed data:', {
      skills: parser.skills,
      education: parser.education,
      certifications: parser.certifications,
      languages: parser.languages,
      location: parser.location,
      experience_years: parser.experience_years,
      phone: data.phone,
      email: data.email
    });

    const resumeData = {
      file_path: filePath,
      summary: parser.summary || '',
      extracted_skills: parser.skills || [],
      education: this.formatEducation(parser.education),
      certifications: parser.certifications || [],
      languages: parser.languages?.length ? parser.languages : ['Arabic'],
      experience_years: this.parseExperience(parser.experience_years || data.estimated_experience_years),
      phone: data.phone || null,
      university: parser.education?.university || null,
      location: parser.location || null,
      user: { id: userId } as any,
    };

    console.log('Saving resume data:', resumeData);

    const resume = this.resumeRepo.create(resumeData as DeepPartial<ResumeEntity>);
    const savedResume = await this.resumeRepo.save(resume);
    
    console.log('Saved Resume:', savedResume);
    return savedResume;
  }catch (err: any) {
  console.error('Error sending to Flask:', err.message);

  if (err.response) {
    const status = err.response.status;
    const data = err.response.data;

    console.error(' Flask response error:', data);

    throw new HttpException(
      {
        analysis_status: data.analysis_status || 'failed',
        error_code: data.error_code || 'FLASK_ERROR',
        message: data.message || 'Error returned from CV analyzer'
      },
      status
    );
  }


  throw new InternalServerErrorException(
    'Internal server error while analyzing CV'
  );
}

}

private formatEducation(education: any): string[] {
  console.log('Formatting education:', education);
  
  if (!education || typeof education !== 'object') return [];
  
  const result = [
    education.degree,
    education.major, 
    education.university
  ].filter(Boolean) as string[];
  
  console.log('Formatted education:', result);
  return result;
}

private parseExperience(experience: any): number {
  console.log('Parsing experience:', experience);
  
  if (!experience || experience === "" || experience === "0") {
    return 1;
  }
  if (typeof experience === 'string') {
    const match = experience.match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }
  return parseInt(experience) || 1;
}



  //  async updateResume(id: number, newFilePath: string, userId: number) {
  //   const resume = await this.resumeRepo.findOne({ where: { id }, relations: ['user'] });
  //   if (!resume) throw new NotFoundException('Resume not found');
  //   if (resume.user.id !== userId) throw new ForbiddenException('Not your resume');
  //   if (existsSync(resume.file_path)) {
  //     unlinkSync(resume.file_path);
  //   }
  //   await this.resumeRepo.remove(resume);
  //   return this.sendToFlaskAndSave(newFilePath, userId);
  // }

  // resumes.service.ts

  async updateResumeByUserId(newFilePath: string, userId: number) {
    // البحث عن الـ Resume باستخدام userId فقط
    const resume = await this.resumeRepo.findOne({ 
      where: { user: { id: userId } }, 
      relations: ['user'] 
    });
    
    if (!resume) {
      throw new NotFoundException('Resume not found for this user');
    }
    
    // تحقق من الملكية (في هذه الحالة تأكد أن الـ Resume للمستخدم)
    if (resume.user.id !== userId) {
      throw new ForbiddenException('Not your resume');
    }
    
    // حذف الملف القديم
    if (existsSync(resume.file_path)) {
      unlinkSync(resume.file_path);
    }
    
    // إزالة الـ Resume القديم من قاعدة البيانات
    await this.resumeRepo.remove(resume);
    
    await this.cacheManager.del(`recommended_jobs_user_${userId}`);
    // إنشاء Resume جديد باستخدام الملف الجديد
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
    await this.cacheManager.del(`recommended_jobs_user_${userId}`);
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
        file_path: '', 
        location: resumeDto.location,
        languages: normalizeArray(resumeDto.languages),
        experience_years: resumeDto.experience_years,
        extracted_skills: normalizeArray(resumeDto.extracted_skills),
        certifications: normalizeArray(resumeDto.certifications)|| '',
        education: normalizeArray(resumeDto.education)|| '',
        phone: resumeDto.phone,
        university: resumeDto.university,
    });

    await this.resumeRepo.save(resume)

    return resume

  }
}


