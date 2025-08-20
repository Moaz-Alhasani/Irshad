import { Module } from '@nestjs/common';
import { CompanyManagementService } from './company-management.service';
import { CompanyManagementController } from './company-management.controller';

@Module({
  controllers: [CompanyManagementController],
  providers: [CompanyManagementService],
})
export class CompanyManagementModule {}
