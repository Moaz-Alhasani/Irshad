import { Request } from 'express';
import { Controller, Get, Post, Body, Param, Put, UseGuards, UseInterceptors, UploadedFile, ParseIntPipe, Req, Res, Query } from '@nestjs/common';
import { CompanyManagementService } from './company-management.service';
import { CreateCompanyManagementDto } from './dto/create-company-management.dto';
import { UpdateCompanyManagementDto } from './dto/update-company-management.dto';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth.guard';
import { CurrentUser } from 'src/user/decorators/current_user.decorators';
import { Roles } from 'src/user/decorators/roles.decorators';
import { RolesGuard } from 'src/user/guards/roles-guard';
import { LoginCompanyDto } from './dto/loginCompany.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CompanyRole } from './entities/company-management.entity';
import { generateFingerprint } from 'src/utils/fingerprint';
import {  Response } from 'express';
import { UserRole } from 'src/user/entities/user.entity';

@Controller('company-management')
export class CompanyManagementController {
  constructor(private readonly companyManagementService: CompanyManagementService) {}

@Post('company-register')
  @UseInterceptors(FileInterceptor('companyLogo', {
    storage: diskStorage({
      destination: './uploads/company-logos',
      filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
    }),
  }))
  async createCompany(
    @Body() createCompanyDto: CreateCompanyManagementDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const logoPath = file ? `uploads/company-logos/${file.filename}` : null;
    const fingerprint = generateFingerprint(req);

    const { company, accessToken, refreshToken } =
      await this.companyManagementService.RegisterAsCompany(createCompanyDto, logoPath, fingerprint);

    res.cookie('accessToken', accessToken, 
      { httpOnly: true,
         secure: true,
          sameSite: 'none',
           maxAge: 1000 * 60 * 15 
          });
    res.cookie('refreshToken', refreshToken, 
      { httpOnly: true,
         secure: true,
          sameSite: 'none',
           maxAge: 7 * 24 * 60 * 60 * 1000 
      });

    return { company, message: 'Registration successful' };
  }

  @Put('update/:id')
  @UseInterceptors(FileInterceptor('companyLogo', {
    storage: diskStorage({
      destination: './uploads/company-logos',
      filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
    }),
  }))
  async updateCompany(@Param('id') id: number, @Body() updateDto: UpdateCompanyManagementDto, @UploadedFile() file: Express.Multer.File) {
    const logoPath = file ? `uploads/company-logos/${file.filename}` : undefined;
    return this.companyManagementService.updateCompany(id, updateDto, logoPath);
  }

@Post('company-login')
async LoginCompany(
  @Body() companylogindto: LoginCompanyDto,
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
) {
  const fingerprint = generateFingerprint(req);

  const { company, accessToken, refreshToken } =
    await this.companyManagementService.LoginComapny(companylogindto, fingerprint);

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 15,
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return {
    company,
    message: 'Login successful',
  };
}

  @Get(':id/jobs')
  @UseGuards(JwtAuthGuard)
  async getJobsByCompany(@Param('id') companyId: number) {
    return this.companyManagementService.getCompanyJobs(companyId);
  }

  @Get('company-jobs-number')
  @UseGuards(JwtAuthGuard)
  async getNumberOfCompanyJobs(@CurrentUser() company: any) {
    return this.companyManagementService.getNumberofCompanyJobs(company);
  }

  @Get(':jobId/applicants/count')
  @UseGuards(JwtAuthGuard)
  async getApplicantsCountOfJobs(@Param('jobId', ParseIntPipe) jobid: number, @CurrentUser() company: any) {
    return this.companyManagementService.numberofApplyForJobs(jobid, company);
  }

  @Get('acceptuser/:userid')
  @Roles(CompanyRole.COMPANY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async acceptTheUseraftertheinterview(@Param('userid', ParseIntPipe) userid: number) {
    return this.companyManagementService.acceptTheUseraftertheinterviewservice(userid);
  }

  @Get('rejectuser/:userid')
  @Roles(CompanyRole.COMPANY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async rejectTheUseraftertheinterview(@Param('userid', ParseIntPipe) userid: number) {
    return this.companyManagementService.rejectTheUseraftertheinterviewservice(userid);
  }

  
  @Get('companyCount')
  @Roles(UserRole.ADMIN,UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard,RolesGuard)
  async getCompanyCount(){
    return this.companyManagementService.getcompanycount()
  }

  @Get('CompaniesStatus')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getCompanyStatus(
    @Query('status') status?: 'all' | 'pending' | 'approved',
  ) {
    return this.companyManagementService.getAllCompaniesWithStatus(status);
  }


  @Post('search-company')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async searchCompany(@Body('keyword') keyword: string) {
    return this.companyManagementService.searchCompanyByName(keyword);
  }

  @Get("pending-companies")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getPendingCompanies() {
    return await this.companyManagementService.getPendingCompaniesWithCount();
  }


  @Get("company/job/:jobId/applicants")
  @Roles(CompanyRole.COMPANY)
  @UseGuards(JwtAuthGuard,RolesGuard)
  async getApplicants(
    @Param('jobId',ParseIntPipe)jobId:number,
    @CurrentUser()currentUser:any
  ){
    return await this.companyManagementService.getApplicantsForJob(jobId,currentUser.id)
  }
}
