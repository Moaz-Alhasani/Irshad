import { SetMetadata } from "@nestjs/common";
import { UserRole } from "../entities/user.entity";
import { CompanyRole } from "src/company-management/entities/company-management.entity";

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (UserRole | CompanyRole)[]) => SetMetadata(ROLES_KEY, roles);
