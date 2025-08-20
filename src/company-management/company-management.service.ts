import { Injectable } from '@nestjs/common';
import { CreateCompanyManagementDto } from './dto/create-company-management.dto';
import { UpdateCompanyManagementDto } from './dto/update-company-management.dto';

@Injectable()
export class CompanyManagementService {
  create(createCompanyManagementDto: CreateCompanyManagementDto) {
    return 'This action adds a new companyManagement';
  }

  findAll() {
    return `This action returns all companyManagement`;
  }

  findOne(id: number) {
    return `This action returns a #${id} companyManagement`;
  }

  update(id: number, updateCompanyManagementDto: UpdateCompanyManagementDto) {
    return `This action updates a #${id} companyManagement`;
  }

  remove(id: number) {
    return `This action removes a #${id} companyManagement`;
  }
}
