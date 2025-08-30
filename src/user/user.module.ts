import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule} from '@nestjs/jwt';
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

@Module({
  imports:[TypeOrmModule.forFeature([UserEntity,CompanyEntity,ResumeEntity]),
  PassportModule,
  JwtModule.register({}),
  forwardRef(() => CompanyManagementModule),
  ResumesModule,
  JobsModule
],
  exports:[AuthModule,RolesGuard,AuthService],
  controllers: [AuthController],
  providers: [AuthService,jwtStrategy,RolesGuard],
})
export class AuthModule {}
