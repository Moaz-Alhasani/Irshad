import { forwardRef, Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobEntity } from './entities/job.entity';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { CompanyManagementModule } from 'src/company-management/company-management.module';

@Module({
  imports:[TypeOrmModule.forFeature([JobEntity,CompanyEntity]),forwardRef(() => CompanyManagementModule)],
  controllers: [JobsController],
  providers: [JobsService],
  exports:[JobsService]
})
export class JobsModule {}
