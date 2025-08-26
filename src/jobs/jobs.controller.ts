import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth.guard';
import { CurrentUser } from 'src/user/decorators/current_user.decorators';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':companyId')
  async createJob(
    @Param('companyId') companyId: number,
    @Body() createJobDto: CreateJobDto,
    @CurrentUser() user: any,
  ) {

    return this.jobsService.createJob(createJobDto, companyId);
  }


  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateJob(
    @Param('id') id: number,
    @Body() updateDto: Partial<CreateJobDto>,
  ) {
    return this.jobsService.updateJob(id, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteJob(@Param('id') id: number) {
    return this.jobsService.deleteJob(id);
  }

}
