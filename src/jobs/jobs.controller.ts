import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, UseInterceptors, UploadedFile } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth.guard';
import { CurrentUser } from 'src/user/decorators/current_user.decorators';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { Roles } from 'src/user/decorators/roles.decorators';
import { UserRole } from 'src/user/entities/user.entity';
import { RolesGuard } from 'src/user/guards/roles-guard';



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
  @Roles(UserRole.EMPLOYER)
  @UseGuards(JwtAuthGuard,RolesGuard)
  @Post(':companyId')
  @ImageFileInterceptor('file')
  async createJob(
    @Param('companyId') companyId: number,
    @Body() createJobDto: CreateJobDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    let imageUrl:string|undefined = undefined;
    if (file) {
    imageUrl = `http://localhost:3000/uploads/images/${file.filename}`;
    }
    return this.jobsService.createJob({ ...createJobDto, image: imageUrl }, companyId);
  }

  @Roles(UserRole.EMPLOYER)
  @UseGuards(JwtAuthGuard,RolesGuard)
  @ImageFileInterceptor('file')
  @Put(':id')
  async updateJob(
    @Param('id') id: number,
    @Body() updateDto: Partial<CreateJobDto>,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser()user:any
  ) {

    let imageUrl:string|undefined = undefined;
    if (file) {
    imageUrl = `http://localhost:3000/uploads/images/${file.filename}`;
    }

    return this.jobsService.updateJob(id,{...updateDto,image:imageUrl},user);
  }
  @Roles(UserRole.EMPLOYER,UserRole.ADMIN)
  @UseGuards(JwtAuthGuard,RolesGuard)
  @Delete(':id')
  async deleteJob(@Param('id') id: number,
    @CurrentUser()user:any
  ) {
    return this.jobsService.deleteJob(id,user);
  }

}
