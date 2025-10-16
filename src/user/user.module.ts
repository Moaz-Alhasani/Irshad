import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from './guards/roles-guard';
import { UserEntity } from './entities/user.entity';
import { AuthController } from './user.controller';
import { AuthService } from './user.service';
import { jwtStrategy } from './strategies/jwt.strategy';
import { CompanyManagementModule } from 'src/company-management/company-management.module';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { ResumeEntity } from 'src/resumes/entities/resume.entity';
import { ResumesModule } from 'src/resumes/resumes.module';
import { JobsModule } from 'src/jobs/jobs.module';
import Redis from 'ioredis';
import { MailService } from './gobal/MailService';

import { MailModule } from './gobal/mail.module';
import { RefreshTokenEntity } from './entities/refreshToken.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JobapplyModule } from 'src/jobapply/jobapply.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, CompanyEntity, ResumeEntity,RefreshTokenEntity]),
    PassportModule,
    JwtModule.register({
       secret: process.env.JWT_SECRET || 'jwt_secret',
      signOptions: { expiresIn: '15m' },
    }),
    forwardRef(() => CompanyManagementModule),
    forwardRef(() => ResumesModule), 
    JobsModule,
    MailModule,
    forwardRef(() => JobapplyModule)
  ],
  exports: [RolesGuard, AuthService, JwtModule, JwtAuthGuard],
  controllers: [AuthController],
  providers: [
    JwtAuthGuard,
    AuthService,
    jwtStrategy,
    RolesGuard
  ],
})
export class AuthModule {}
