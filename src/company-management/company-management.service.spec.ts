import { Test, TestingModule } from '@nestjs/testing';
import { CompanyManagementService } from './company-management.service';

describe('CompanyManagementService', () => {
  let service: CompanyManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompanyManagementService],
    }).compile();

    service = module.get<CompanyManagementService>(CompanyManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
