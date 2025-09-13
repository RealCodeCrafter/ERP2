import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token mavjud emas');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token formati noto‘g‘ri');
    }

    try {
      const payload = this.jwtService.verify(token);
      request.user = payload;

      // Class-level + Method-level Roles ni tekshiramiz
      const requiredRoles = this.reflector.getAllAndOverride<string[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (!requiredRoles) {
        return true; // rol ko‘rsatilmagan bo‘lsa, faqat login tekshiriladi
      }

      if (!payload.role || !requiredRoles.includes(payload.role)) {
        throw new UnauthorizedException(
          'Ushbu amalni bajarishga ruxsat yo‘q',
        );
      }

      return true;
    } catch (error) {
      throw new UnauthorizedException('Token noto‘g‘ri yoki muddati tugagan');
    }
  }
}
