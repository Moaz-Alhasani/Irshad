import { Module } from '@nestjs/common';
import { CompanyManagementService } from './company-management.service';
import { CompanyManagementController } from './company-management.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyEntity } from './entities/company-management.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { AuthModule } from 'src/user/user.module';

@Module({
  imports:[TypeOrmModule.forFeature([CompanyEntity,UserEntity]),AuthModule],
  controllers: [CompanyManagementController],
  providers: [CompanyManagementService],
  exports:[CompanyManagementService,CompanyManagementModule]
})
export class CompanyManagementModule {}
