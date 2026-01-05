import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Param, Put, Delete, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResumesService } from './resumes.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Roles } from 'src/user/decorators/roles.decorators';
import { UserRole } from 'src/user/entities/user.entity';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth.guard';
import { RolesGuard } from 'src/user/guards/roles-guard';
import { CurrentUser } from 'src/user/decorators/current_user.decorators';
import { ResumeDto } from './dto/resume.dto';


@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Roles(UserRole.JOB_SEEKER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('upload')
  @UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = join(__dirname, '../../uploads/cv');
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix =
          Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + extname(file.originalname));
      },
    }),

    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'application/pdf',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(
          new Error('Only PDF, TXT, and DOCX files are allowed'),
          false,
        );
      }

      cb(null, true);
    },
  }),
)
  async uploadCV(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.resumesService.sendToFlaskAndSave(file.path, user.id);
  }



  @Roles(UserRole.JOB_SEEKER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put('/update')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(__dirname, '../../uploads/cv');
          if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  async updateCV(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.resumesService.updateResumeByUserId( file.path, user.id);
  }


  @Roles(UserRole.JOB_SEEKER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  async deleteCV(@Param('id') id: number, @CurrentUser() user: any) {
    return this.resumesService.deleteResume(id, user.id);
  }


  @UseGuards(JwtAuthGuard)
  @Post('create') 
  async createResume(
    @Body() resumeDto: ResumeDto,
    @CurrentUser() currentUser: any
  ) {
    return this.resumesService.registerResume(currentUser, resumeDto);
  }
  
}
