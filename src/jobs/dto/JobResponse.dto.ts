import { EmploymentType, JobEntity } from "../entities/job.entity";

export class JobResponseDto {
  id: number;
  title: string;
  description: string;
  requiredSkills: string[];
  requiredExperience: number;
  requiredEducation: string[];
  location: string;
  employmentType: EmploymentType;
  image: string;
  createdAt: Date;
  
  company?: {
    id: number;
    email: string;
    companyName: string;
    companyWebsite: string;
    companyLocation: string;
    isVerified: boolean;
    companyLogo: string;
    role: string;
    createdAt: Date;
  };
  
  constructor(job: JobEntity) {
    this.id = job.id;
    this.title = job.title;
    this.description = job.description;
    this.requiredSkills = job.requiredSkills;
    this.requiredExperience = job.requiredExperience;
    this.requiredEducation = job.requiredEducation;
    this.location = job.location;
    this.employmentType = job.employmentType;
    this.image = job.image;
    this.createdAt = job.createdAt;
    
    if (job.company) {
      const { password, ...companyData } = job.company;
      this.company = companyData as any;
    }
  }
}