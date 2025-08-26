import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobEntity } from './entities/job.entity';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';

@Module({
  imports:[TypeOrmModule.forFeature([JobEntity,CompanyEntity])],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
