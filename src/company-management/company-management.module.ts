import { forwardRef, Module } from '@nestjs/common';
import { CompanyManagementService } from './company-management.service';
import { CompanyManagementController } from './company-management.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyEntity } from './entities/company-management.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { AuthModule } from 'src/user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JobApplyEntity } from 'src/jobapply/entities/jobApplyEntitt';
import { JobsModule } from 'src/jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyEntity, UserEntity,JobApplyEntity]),
    forwardRef(() => AuthModule),
      PassportModule,
      JwtModule.register({}), 
      JobsModule
  ],
  controllers: [CompanyManagementController],
  providers: [CompanyManagementService],
  exports: [CompanyManagementService]
})
export class CompanyManagementModule {}
