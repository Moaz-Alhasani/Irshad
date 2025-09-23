
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Put, ParseIntPipe } from '@nestjs/common';
import { CompanyManagementService } from './company-management.service';
import { CreateCompanyManagementDto } from './dto/create-company-management.dto';
import { UpdateCompanyManagementDto } from './dto/update-company-management.dto';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth.guard';
import { CurrentUser } from 'src/user/decorators/current_user.decorators';
import { Roles } from 'src/user/decorators/roles.decorators';
import { UserRole } from 'src/user/entities/user.entity';
import { RolesGuard } from 'src/user/guards/roles-guard';
import { LoginCompanyDto } from './dto/loginCompany.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CompanyRole } from './entities/company-management.entity';

@Controller('company-management')
export class CompanyManagementController {
  constructor(private readonly companyManagementService: CompanyManagementService) {}

  @Post('company-register')
  @UseInterceptors(FileInterceptor('companyLogo', {
    storage: diskStorage({
      destination: './uploads/company-logos',
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
      },
    }),
  }))
  async createCompany(
    @Body() createCompanyDto: CreateCompanyManagementDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const logoPath = file ? `uploads/company-logos/${file.filename}` : undefined;
    return this.companyManagementService.RegisterAsCompany(createCompanyDto, logoPath);
  }

  @Put('update/:id')
  @UseInterceptors(FileInterceptor('companyLogo', {
    storage: diskStorage({
      destination: './uploads/company-logos',
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
      },
    }),
  }))
  async updateCompany(
    @Param('id') id: number,
    @Body() updateDto: UpdateCompanyManagementDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const logoPath = file ? `uploads/company-logos/${file.filename}` : undefined;
    return this.companyManagementService.updateCompany(id, updateDto, logoPath);
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
  @Get('acceptuser/:userid')
  @Roles(CompanyRole.COMPANY)
  @UseGuards(JwtAuthGuard,RolesGuard)
  async acceptTheUseraftertheinterview(@Param('userid',ParseIntPipe)userid:number)    {
     return this.companyManagementService.acceptTheUseraftertheinterviewservice(userid)
  }
  @Get('rejectuser/:userid')
  @Roles(CompanyRole.COMPANY)
  @UseGuards(JwtAuthGuard,RolesGuard)
  async rejectTheUseraftertheinterview(@Param('userid',ParseIntPipe)userid:number)    {
     return this.companyManagementService.rejectTheUseraftertheinterviewservice(userid)
  }                              
}
