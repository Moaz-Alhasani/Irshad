import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CompanyManagementService } from './company-management.service';
import { CreateCompanyManagementDto } from './dto/create-company-management.dto';
import { UpdateCompanyManagementDto } from './dto/update-company-management.dto';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth.guard';
import { CurrentUser } from 'src/user/decorators/current_user.decorators';
import { Roles } from 'src/user/decorators/roles.decorators';
import { UserRole } from 'src/user/entities/user.entity';
import { RolesGuard } from 'src/user/guards/roles-guard';

@Controller('company-management')
export class CompanyManagementController {
  constructor(private readonly companyManagementService: CompanyManagementService) {}

  @Roles(UserRole.EMPLOYER)
  @UseGuards(JwtAuthGuard,RolesGuard)
  @Post('add-company')
  async createCompany(
    @Body() createCompanyDto: CreateCompanyManagementDto,
    @CurrentUser() user: any,
  ) {
    const company = await this.companyManagementService.createCompany(createCompanyDto, user.id);
      return {
        message: 'Company created successfully. Pending admin approval.',
        company
      }
  }

  
  @Get(':id/jobs')
  @UseGuards(JwtAuthGuard)
  async getJobsByCompany(@Param('id') companyId: number) {
    return this.companyManagementService.getCompanyJobs(companyId);
  }

}
