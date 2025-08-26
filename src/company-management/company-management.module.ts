import { Module } from '@nestjs/common';
import { CompanyManagementService } from './company-management.service';
import { CompanyManagementController } from './company-management.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyEntity } from './entities/company-management.entity';
import { UserEntity } from 'src/user/entities/user.entity';

@Module({
  imports:[TypeOrmModule.forFeature([CompanyEntity,UserEntity])],
  controllers: [CompanyManagementController],
  providers: [CompanyManagementService],
})
export class CompanyManagementModule {}
