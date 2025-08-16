import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { UserRole } from "../entities/user.entity";
import { ROLES_KEY } from "../decorators/roles.decorators";

@Injectable()
export class RolesGuard implements CanActivate{
    constructor(private reflector: Reflector){}
    canActivate(context: ExecutionContext): boolean {
        const requiredRoles=this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY,[
            context.getHandler(),
            context.getClass()
        ])
        if (!requiredRoles){
            return true
        }
        const {user}= context.switchToHttp().getRequest();
        if(!user){
            throw new ForbiddenException('User not authenticated'); 
        }
        const hasRequiredRole = requiredRoles.some((role) => user.role === role);
        if (!hasRequiredRole) {
        throw new ForbiddenException('Insufficient permission');
        }
        return true;
    }
}