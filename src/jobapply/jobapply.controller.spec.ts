import { Test, TestingModule } from '@nestjs/testing';
import { JobapplyController } from './jobapply.controller';

describe('JobapplyController', () => {
  let controller: JobapplyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobapplyController],
    }).compile();

    controller = module.get<JobapplyController>(JobapplyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
