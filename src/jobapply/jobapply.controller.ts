import { Body, Controller, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { JobapplyService } from './jobapply.service';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth.guard';
import { CurrentUser } from 'src/user/decorators/current_user.decorators';
import { CreateJobApplyDto } from './dto/createjobsdto';
import { Roles } from 'src/user/decorators/roles.decorators';
import { UserRole } from 'src/user/entities/user.entity';
import { RolesGuard } from 'src/user/guards/roles-guard';
import { jwtStrategy } from 'src/user/strategies/jwt.strategy';

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
       const savedApplication =this.jobsservice.applyToJob(jobid, currentuser, createjobapplydto);
        return {
            message: "You applied for this job successfully",
            acceptance_score: (await savedApplication).acceptance_score,
            salary:(await savedApplication).estimated_salary+"$"
        };
    }

    @Post('withdrawjobs/:jobid')
    @Roles(UserRole.JOB_SEEKER)
    @UseGuards(JwtAuthGuard,RolesGuard)
    async withdrawJobs(@Param('jobid',ParseIntPipe)jobid:number,
                    @CurrentUser()currentuser:any    
    ){
        return this.jobsservice.withdraw(jobid,currentuser)
    }

    
    @Roles(UserRole.JOB_SEEKER)
    @UseGuards(JwtAuthGuard,RolesGuard)
    @Post(':jobId/test')
        async getJobTest(@Param('jobId') jobId: number, @CurrentUser() user: any) {
        return this.jobsservice.getJobTest(jobId, user.id);
    }
    @Roles(UserRole.JOB_SEEKER)
    @UseGuards(JwtAuthGuard,RolesGuard)
    @Post(':jobId/test/submit')
        async submitJobTest(
        @Param('jobId') jobId: number,
        @CurrentUser() user: any,
        @Body('answers') answers: { questionId: number; selectedOptionId: number }[],
        ) {
        return this.jobsservice.submitJobTest(jobId, user.id, answers);
    }

}
