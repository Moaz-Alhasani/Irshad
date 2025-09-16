import { Module } from '@nestjs/common';
import { JobapplyController } from './jobapply.controller';
import { JobapplyService } from './jobapply.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobEntity } from 'src/jobs/entities/job.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { ResumeEntity } from 'src/resumes/entities/resume.entity';
import { JobApplyEntity } from './entities/jobApplyEntitt';
import { InterviewEntity } from 'src/interview/entities/interview.entity';

@Module({
  imports:[
    TypeOrmModule.forFeature([
      JobEntity,
      UserEntity,
      CompanyEntity,
      ResumeEntity,
      JobApplyEntity, 
      InterviewEntity,
    ]),
  ],
  controllers: [JobapplyController],
  providers: [JobapplyService],
  exports:[JobapplyService]
})
export class JobapplyModule {}
