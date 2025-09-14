import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET');
        
        if (!secret) {
          throw new Error('JWT_SECRET is not defined in environment variables');
        }
        
        if (!refreshSecret) {
          throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
        }

        return {
          secret: secret,
          signOptions: {
            expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    TokenService,
    JwtStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
    JwtRefreshGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    TokenService,
    JwtAuthGuard,
    RolesGuard,
    PassportModule,
  ],
})
export class AuthModule {}
