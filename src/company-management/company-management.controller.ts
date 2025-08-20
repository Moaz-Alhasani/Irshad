import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CompanyManagementService } from './company-management.service';
import { CreateCompanyManagementDto } from './dto/create-company-management.dto';
import { UpdateCompanyManagementDto } from './dto/update-company-management.dto';

@Controller('company-management')
export class CompanyManagementController {
  constructor(private readonly companyManagementService: CompanyManagementService) {}

  @Post()
  create(@Body() createCompanyManagementDto: CreateCompanyManagementDto) {
    return this.companyManagementService.create(createCompanyManagementDto);
  }

  @Get()
  findAll() {
    return this.companyManagementService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companyManagementService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCompanyManagementDto: UpdateCompanyManagementDto) {
    return this.companyManagementService.update(+id, updateCompanyManagementDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.companyManagementService.remove(+id);
  }
}
