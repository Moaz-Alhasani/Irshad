import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth.guard';
import { CurrentUser } from 'src/user/decorators/current_user.decorators';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { Roles } from 'src/user/decorators/roles.decorators';
import { UserRole } from 'src/user/entities/user.entity';
import { RolesGuard } from 'src/user/guards/roles-guard';
import { CompanyRole } from 'src/company-management/entities/company-management.entity';
import { SearchJobDto } from './dto/job_filter_dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { jwtStrategy } from 'src/user/strategies/jwt.strategy';
import { JobDetailDto } from './dto/job-details.dto';

export function ImageFileInterceptor(fieldName: string) {
  return UseInterceptors(
    FileInterceptor(fieldName, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(__dirname, '../../uploads/images');
          if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('only these prefix(jpg, jpeg, png, gif)'), false);
        }
        cb(null, true);
      },
    }),
  );
}

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  private transformJobBody(body: any, file?: Express.Multer.File): CreateJobDto {
    let embedding: number[] | undefined = undefined;
    if (body.embedding) {
      try {
        embedding = JSON.parse(body.embedding);
      } catch (e) {
        embedding = undefined;
      }
    }
    return {
      title: body.title,
      description: body.description,
      requiredSkills: body.requiredSkills?.split(',') || [],
      requiredEducation: body.requiredEducation?.split(',') || [],
      requiredExperience: body.requiredExperience ? Number(body.requiredExperience) : undefined,
      location: body.location,
      employmentType: body.employmentType,
      image: file ? `http://localhost:3000/uploads/images/${file.filename}` : undefined,
      embedding,
    };
  }
  @Post(':companyId')
  @Roles(CompanyRole.COMPANY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ImageFileInterceptor('img')
  async createJob(
    @Param('companyId') companyId: number,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const createJobDto = this.transformJobBody(body, file);
    return this.jobsService.createJob(createJobDto, companyId, user);
  }

  @Post(':jobId/questions')
  @Roles(CompanyRole.COMPANY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addQuestion(
    @Param('jobId') jobId: number,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    return this.jobsService.addQuestion(jobId, createQuestionDto);
  }


@Get(':jobId/shuffled-questions')
@Roles(UserRole.JOB_SEEKER)
@UseGuards(JwtAuthGuard,RolesGuard)
async getShuffledQuestions(
  @Param('jobId',ParseIntPipe) jobId: number,
  @CurrentUser()currentUser:any) {
        return this.jobsService.getShuffledJobQuestions(jobId,currentUser.id);
}



@Post(':jobId/test/expire')
@Roles(UserRole.JOB_SEEKER)
@UseGuards(JwtAuthGuard, RolesGuard)
async expireTest(
  @Param('jobId', ParseIntPipe) jobId: number,
  @CurrentUser() user: any,
) {
  return this.jobsService.expireJobTest(jobId, user.id);
}


  @Put(':id')
  @Roles(CompanyRole.COMPANY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ImageFileInterceptor('img')
  async updateJob(
    @Param('id') id: number,
    @Body() body: any, 
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() company: any,
  ) {
    const updateDto = this.transformJobBody(body, file);
    return this.jobsService.updateJob(id, updateDto, company);
  }

  @Roles(UserRole.ADMIN, CompanyRole.COMPANY) 
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  async deleteJob(@Param('id') id: number, @CurrentUser() actor: any) {
    return this.jobsService.deleteJob(id, actor);
  }



  @Get('')
  async getAllJobs(){
    return this.jobsService.getAllJobs(); 
  }

  @Get('search')
  async searchjobs(
    @Query('title') title?: string,
    @Query('location') location?: string,
    @Query('jobType') jobType?: string,
  ) {
    return this.jobsService.searchJobs({ title, location, jobType });
  }

  @Get('count-jobs')
  @Roles(UserRole.ADMIN,UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard,RolesGuard)
  async getNumberOfJobs(){
    return this.jobsService.getjobsCount();
  }


  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getJobDetails(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<JobDetailDto> {
    return this.jobsService.getJobDetails(id);
  } 
 
}

