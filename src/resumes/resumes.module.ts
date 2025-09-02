import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumesService } from './resumes.service';
import { ResumesController } from './resumes.controller';
import {  ResumeEntity } from './entities/resume.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { JobApplyEntity } from 'src/jobapply/entities/jobApplyEntitt';

@Module({
imports: [TypeOrmModule.forFeature([ResumeEntity,UserEntity,JobApplyEntity])],
  controllers: [ResumesController],
  providers: [ResumesService],
  exports: [ResumesService],
})
export class ResumesModule {}
