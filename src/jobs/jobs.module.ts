import { forwardRef, Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobEntity } from './entities/job.entity';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { CompanyManagementModule } from 'src/company-management/company-management.module';
import { AuthModule } from 'src/user/user.module';

@Module({
  imports:[TypeOrmModule.forFeature([JobEntity,CompanyEntity]),forwardRef(() => CompanyManagementModule),forwardRef(() => AuthModule)],
  controllers: [JobsController],
  providers: [JobsService],
  exports:[JobsService,JobsModule]
})
export class JobsModule {}
