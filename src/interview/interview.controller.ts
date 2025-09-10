import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { Roles } from 'src/user/decorators/roles.decorators';
import { UserRole } from 'src/user/entities/user.entity';
import { CompanyRole } from 'src/company-management/entities/company-management.entity';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth.guard';
import { RolesGuard } from 'src/user/guards/roles-guard';
import { SendInterviewLinkDto } from './dto/interview.dto';
import { CurrentUser } from 'src/user/decorators/current_user.decorators';
import { application } from 'express';

@Controller('interview')
export class InterviewController {
    constructor(private interveiwservice:InterviewService){

    }

    @Post(':jobId/applicants/:applicationId/accept')
    @Roles(CompanyRole.COMPANY)
    @UseGuards(JwtAuthGuard, RolesGuard)
    async sendLinkToApplicant(
        @Param('jobId', ParseIntPipe) jobId: number,
        @Param('applicationId', ParseIntPipe) applicationId: number,
        @Body() sendInterviewLinkDto: SendInterviewLinkDto,
        @CurrentUser() company: any
        ) {
        return this.interveiwservice.acceptApplicant(
            jobId,
            applicationId,
            sendInterviewLinkDto,
            company
        );
    }

}
