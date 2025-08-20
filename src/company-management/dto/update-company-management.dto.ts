import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyManagementDto } from './create-company-management.dto';

export class UpdateCompanyManagementDto extends PartialType(CreateCompanyManagementDto) {}
