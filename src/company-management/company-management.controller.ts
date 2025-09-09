import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CompanyManagementService } from './company-management.service';
import { CreateCompanyManagementDto } from './dto/create-company-management.dto';
import { UpdateCompanyManagementDto } from './dto/update-company-management.dto';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth.guard';
import { CurrentUser } from 'src/user/decorators/current_user.decorators';
import { Roles } from 'src/user/decorators/roles.decorators';
import { UserRole } from 'src/user/entities/user.entity';
import { RolesGuard } from 'src/user/guards/roles-guard';
import { LoginCompanyDto } from './dto/loginCompany.dto';

@Controller('company-management')
export class CompanyManagementController {
  constructor(private readonly companyManagementService: CompanyManagementService) {}

  @Post('company-register')
  async createCompany(
    @Body() createCompanyDto: CreateCompanyManagementDto,
  ) {
    return this.companyManagementService.RegisterAsCompany(createCompanyDto);
  }

  @Post('company-login')
  async LoginCompany(@Body()companylogindto:LoginCompanyDto){
      return this.companyManagementService.LoginComapny(companylogindto)
  }
  
  @Get(':id/jobs')
  @UseGuards(JwtAuthGuard)
  async getJobsByCompany(@Param('id') companyId: number) {
    return this.companyManagementService.getCompanyJobs(companyId);
  }

  @Get('company-jobs-number')
  @UseGuards(JwtAuthGuard)
  async getNumberOfCompanyJobs(@CurrentUser()company:any){
    return this.companyManagementService.getNumberofCompanyJobs(company)
  }


  @Get(':jobId/applicants/count')
  @UseGuards(JwtAuthGuard)
  async getApplicantsCountOfJobs(@Param('jobId',ParseIntPipe)jobid:number,
                                  @CurrentUser()company:any){
                                    return this.companyManagementService.numberofApplyForJobs(jobid,company)
                                  }
}
