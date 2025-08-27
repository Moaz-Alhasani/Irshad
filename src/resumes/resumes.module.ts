import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumesService } from './resumes.service';
import { ResumesController } from './resumes.controller';
import {  ResumeEntity } from './entities/resume.entity';
import { UserEntity } from 'src/user/entities/user.entity';

@Module({
imports: [TypeOrmModule.forFeature([ResumeEntity,UserEntity])],
  controllers: [ResumesController],
  providers: [ResumesService],
  exports: [ResumesService],
})
export class ResumesModule {}
