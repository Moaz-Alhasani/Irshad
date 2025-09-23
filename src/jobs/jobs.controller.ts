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

  @Roles(CompanyRole.COMPANY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':companyId')
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

  @Roles(CompanyRole.COMPANY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put(':id')
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

  @Get()
  async getJobs() {
    return this.jobsService.getAllJobsWithEmbedding();
  }

  @Get('get-all-jobs')
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
}

