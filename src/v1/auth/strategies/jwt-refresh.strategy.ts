import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { JwtRefreshPayload } from '../interfaces/jwt-payload.interface';
import type { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'), // Make sure this is set
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtRefreshPayload) {
    const refreshToken = (req.body as any).refreshToken;
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    const user = await this.authService.validateRefreshToken(refreshToken, payload);
    
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    return user;
  }
}
