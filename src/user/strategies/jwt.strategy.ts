// auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "../user.service";
import { InjectRepository } from "@nestjs/typeorm";
import { CompanyEntity } from "src/company-management/entities/company-management.entity";
import { Repository } from "typeorm";
import { Request } from 'express';

@Injectable()
export class jwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    @InjectRepository(CompanyEntity)
    private readonly companyRepo: Repository<CompanyEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.accessToken,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'jwt_secret',
      passReqToCallback: true, // ← مهم لتمرير req إلى validate
    });
  }

  async validate(req: Request, payload: any) {
    const currentFingerprint = req ? req.ip + (req.headers['user-agent'] || '') : '';
    const expectedFingerprint = payload.fingerprint;

    if (!expectedFingerprint || !currentFingerprint || expectedFingerprint !== currentFingerprint) {
      throw new UnauthorizedException('Fingerprint mismatch');
    }

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
