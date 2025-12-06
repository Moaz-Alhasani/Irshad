import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './user/user.module';
import { UserEntity } from './user/entities/user.entity';
import { CompanyManagementModule } from './company-management/company-management.module';
import { CompanyEntity } from './company-management/entities/company-management.entity';
import { JobsModule } from './jobs/jobs.module';
import { JobEntity } from './jobs/entities/job.entity';
import { ResumesModule } from './resumes/resumes.module';
import { ResumeEntity } from './resumes/entities/resume.entity';
import { JobapplyModule } from './jobapply/jobapply.module';
import { JobApplyEntity } from './jobapply/entities/jobApplyEntitt';
import { InterviewModule } from './interview/interview.module';
import { InterviewEntity } from './interview/entities/interview.entity';
import { QuestionEntity } from './jobs/entities/question.entity';
import { OptionEntity } from './jobs/entities/option.entity';
import { JobTestAnswerEntity } from './jobapply/entities/jobTestAnswer.entity';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<number>('DB_PORT')),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'), 
        database: configService.get<string>('DB_NAME'),
        entities: [UserEntity,CompanyEntity,JobEntity,ResumeEntity,JobApplyEntity,InterviewEntity,QuestionEntity,JobTestAnswerEntity,OptionEntity],
        synchronize: true,
      }),
    }),
    AuthModule,
    CompanyManagementModule,
    JobsModule,
    ResumesModule,
    JobapplyModule,
    InterviewModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
