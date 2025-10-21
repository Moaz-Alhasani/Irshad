// auth/guards/jwt-auth.guard.ts
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { generateFingerprint } from '../../utils/fingerprint';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        const token = this.extractToken(req);

        if (!token) {
            throw new UnauthorizedException('Access token not found');
        }

        try {
            const decoded = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET || 'jwt_secret',
            });

            const currentFingerprint = generateFingerprint(req);

            if (decoded.fingerprint !== currentFingerprint) {
                throw new UnauthorizedException('Fingerprint mismatch');
            }

            req.user = {
                id: decoded.sub, 
                email: decoded.email,
                role: decoded.role,
            };
            return true;
        } catch (err) {
            console.error('JWT Verification Error:', err.message);
            throw new UnauthorizedException('Invalid or expired token');
        }
    }

    private extractToken(req: Request): string | null {
        return req.cookies?.accessToken || 
               req.headers.authorization?.replace('Bearer ', '');
    }
}