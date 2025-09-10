import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { ResumeEntity } from './entities/resume.entity';
import axios from 'axios';
import { existsSync, unlinkSync } from 'fs';

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

      const embeddingNumbers = Array.isArray(data.skills_embedding)
      ? data.skills_embedding.map(x => Number(x)).filter(x => !isNaN(x))
      : [];
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
        embedding:  embeddingNumbers,
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
}


