import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JobapplyService } from './jobapply.service';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth.guard';
import { CurrentUser } from 'src/user/decorators/current_user.decorators';
import { CreateJobApplyDto } from './dto/createjobsdto';
import { Roles } from 'src/user/decorators/roles.decorators';
import { UserRole } from 'src/user/entities/user.entity';
import { RolesGuard } from 'src/user/guards/roles-guard';

@Controller('jobapply')
export class JobapplyController {
    constructor(private jobsservice:JobapplyService){}

    @Post(':jobid')
    @Roles(UserRole.JOB_SEEKER)
    @UseGuards(JwtAuthGuard,RolesGuard)
    async jobApply(
        @Param('jobid', ParseIntPipe) jobid: number,
        @Body() createjobapplydto: CreateJobApplyDto,
        @CurrentUser() currentuser: any
    ) {
        return this.jobsservice.JobApply(jobid, currentuser, createjobapplydto);
    }
}
