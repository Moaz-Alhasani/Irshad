import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JobEntity } from 'src/jobs/entities/job.entity';
import { Repository } from 'typeorm';
import { ApplicationStatus, JobApplyEntity } from './entities/jobApplyEntitt';
import { CreateJobApplyDto } from './dto/createjobsdto';
import { UserEntity } from 'src/user/entities/user.entity';

@Injectable()
export class JobapplyService {

    constructor(@InjectRepository(JobEntity) private jobEntity:Repository<JobEntity>,
                @InjectRepository(JobApplyEntity) private jobApplyEntity:Repository<JobApplyEntity>,
                @InjectRepository(UserEntity) private userEntity:Repository<UserEntity>,
                ){
    }


    async JobApply(jobid: number,currentuser: any,createjobapplydto: CreateJobApplyDto,) {

        const jobExists = await this.jobExist(jobid);
        if (!jobExists) {
            throw new ForbiddenException(`Job with id ${jobid} does not exist`);
        }

        const olduser = await this.userEntity.findOne({
            where: { id: currentuser.id },
            relations: ['resumes'],
        });
        if (!olduser) {
            throw new ForbiddenException(`User with id ${currentuser.id} does not exist`);
        }
        if(!olduser?.resumes||olduser.resumes.length === 0){
            throw new ForbiddenException(`user dont have an resumes`)
        }
        const applied = this.jobApplyEntity.create({
            user: { id: currentuser.id },
            job: { id: jobid },
            resume:olduser.resumes[0]
        });

        return await this.jobApplyEntity.save(applied);
    }

    
    private async jobExist(jobid: number): Promise<boolean> {
        const oldjob = await this.jobEntity.findOne({
            where: { id: jobid },
        });

        return oldjob !== null && oldjob !== undefined;
    }

}
