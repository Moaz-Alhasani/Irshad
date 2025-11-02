import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumesService } from './resumes.service';
import { ResumesController } from './resumes.controller';
import {  ResumeEntity } from './entities/resume.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { JobApplyEntity } from 'src/jobapply/entities/jobApplyEntitt';
import { AuthModule } from 'src/user/user.module';
import { forwardRef } from '@nestjs/common';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';

@Module({
imports: [
  TypeOrmModule.forFeature([ResumeEntity,UserEntity,JobApplyEntity,CompanyEntity]),
  forwardRef(() => AuthModule),

],
  controllers: [ResumesController],
  providers: [ResumesService],
  exports: [ResumesService], 
})
export class ResumesModule {}
