import { Test, TestingModule } from '@nestjs/testing';
import { JobapplyService } from './jobapply.service';

describe('JobapplyService', () => {
  let service: JobapplyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobapplyService],
    }).compile();

    service = module.get<JobapplyService>(JobapplyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
