import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "../user.service";
import { InjectRepository } from "@nestjs/typeorm";
import { CompanyEntity } from "src/company-management/entities/company-management.entity";
import { Repository } from "typeorm";

@Injectable()
export class jwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    @InjectRepository(CompanyEntity)
    private readonly companyRepo: Repository<CompanyEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'jwt_secret',
    });
  }

  async validate(payload: any) {

    const company = await this.companyRepo.findOne({ where: { id: payload.sub } });
    if (company) {
      return { id: company.id, role: company.role, email: company.email, type: 'company' };
    }

    const user = await this.authService.getUserById(payload.sub);
    if (user) {
      return { id: user.id, role: user.role, email: user.email, type: 'user' };
    }


    throw new UnauthorizedException('Invalid token');
  }
}
