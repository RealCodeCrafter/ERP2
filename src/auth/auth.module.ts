import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../user/entities/user.entity';
import { Role } from '../role/entities/role.entity';
import { AuthGuard } from './auth.guard';
import { SuperAdminSeedService } from './super-admin.seed';

@Global() 
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, Role]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET') || 'juda_secret_key';
        // expiresIn son bo'lishi kerak, masalan: 7 kun = 7 * 24 * 60 * 60 soniya
        const expiresInSeconds = Number(configService.get('JWT_EXPIRES_IN')) || 7 * 24 * 60 * 60;
        return {
          secret: jwtSecret,
          signOptions: { expiresIn: expiresInSeconds },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, SuperAdminSeedService],
  exports: [AuthService, AuthGuard, JwtModule], 
})
export class AuthModule {}
