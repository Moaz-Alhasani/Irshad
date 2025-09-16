import { Module } from '@nestjs/common';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { CompanyManagementModule } from 'src/company-management/company-management.module';
import { JobEntity } from 'src/jobs/entities/job.entity';
import { JobsModule } from 'src/jobs/jobs.module';
import { JobapplyModule } from 'src/jobapply/jobapply.module';
import { AuthModule } from 'src/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/user/entities/user.entity';
import { InterviewEntity } from './entities/interview.entity';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { MailModule } from 'src/user/gobal/mail.module';
import { JobApplyEntity } from 'src/jobapply/entities/jobApplyEntitt';

@Module({
  imports:[
    TypeOrmModule.forFeature([JobEntity,UserEntity,InterviewEntity,CompanyEntity,JobApplyEntity]),
    CompanyManagementModule,
    JobsModule,
    JobapplyModule,
    AuthModule,
    MailModule,
  ],
  controllers: [InterviewController],
  providers: [InterviewService],
  exports:[InterviewModule]
})
export class InterviewModule {}
