import { Test, TestingModule } from '@nestjs/testing';
import { CompanyManagementController } from './company-management.controller';
import { CompanyManagementService } from './company-management.service';

describe('CompanyManagementController', () => {
  let controller: CompanyManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyManagementController],
      providers: [CompanyManagementService],
    }).compile();

    controller = module.get<CompanyManagementController>(CompanyManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
