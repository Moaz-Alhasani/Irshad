import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../user.service';
import { CompanyEntity } from 'src/company-management/entities/company-management.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { generateFingerprint } from '../../utils/fingerprint';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    @InjectRepository(CompanyEntity)
    private readonly companyRepo: Repository<CompanyEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);

    if (!token) throw new UnauthorizedException('Access token not found');

    try {
      const decoded: any = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'jwt_secret',
      });

      // ✅ تحقق Fingerprint
      const currentFingerprint = generateFingerprint(req);
      if (!decoded.fingerprint || decoded.fingerprint !== currentFingerprint) {
        throw new UnauthorizedException('Fingerprint mismatch');
      }

      // ✅ حدد إذا كان token لشركة أو مستخدم عادي
      if (decoded.role === 'company') {
        const company = await this.companyRepo.findOne({ where: { id: decoded.sub } });
        if (!company) throw new UnauthorizedException('Invalid company token');
        req.user = {
          id: company.id,
          email: company.email,
          role: 'company',
          type: 'company',
        };
      } else {
        const user = await this.authService.getUserById(decoded.sub);
        if (!user) throw new UnauthorizedException('Invalid user token');
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          type: 'user',
        };
      }

      return true;
    } catch (err) {
      console.error('JWT Verification Error:', err.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(req: Request): string | null {
    return (
      req.headers.authorization?.replace('Bearer ', '') ||
      req.cookies?.accessToken ||
      req.cookies?.companyAccessToken ||
      null
    );
  }
}
