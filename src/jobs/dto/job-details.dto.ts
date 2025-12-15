export class JobDetailDto {
  id: number;
  title: string;
  type: string;
  location: string;
  companyName: string;
  description: string;
  skills: string;
  experience: string;
  education: string;
  hasTest: boolean;
  testDuration: number;
  employmentType?: string;
  image?: string;
  createdAt?: Date;
  questions?: any[]; // إذا كنت تريد إرجاع الأسئلة بدون isCorrect

  constructor(job: any) {
    this.id = job.id;
    this.title = job.title;
    this.type = job.employmentType?.toUpperCase() || 'FULL TIME';
    this.location = job.location || 'Not specified';
    this.companyName = job.company?.companyName || 'Unknown Company';
    this.description = job.description;
    
    this.skills = Array.isArray(job.requiredSkills) 
      ? job.requiredSkills.join(', ')
      : job.requiredSkills || 'Not specified';
    
    this.experience = job.requiredExperience !== null && job.requiredExperience !== undefined
      ? `${job.requiredExperience}+ years`
      : 'Not specified';
    
    this.education = Array.isArray(job.requiredEducation)
      ? job.requiredEducation.join(', ')
      : job.requiredEducation || 'Not specified';
    
    this.hasTest = job.questions && job.questions.length > 0;
    this.testDuration = this.hasTest ? job.questions.length * 5 : 0;
    
    this.employmentType = job.employmentType;
    this.image = job.image;
    this.createdAt = job.createdAt;
    
    // إضافة الأسئلة بدون isCorrect
    if (job.questions && job.questions.length > 0) {
      this.questions = job.questions.map(question => ({
        id: question.id,
        questionText: question.questionText,
        options: question.options?.map(option => ({
          id: option.id,
          text: option.text,
          // isCorrect تم إخفاؤه هنا
        })),
      }));
    }
  }
}