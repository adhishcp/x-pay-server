import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { user } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'), // Make sure this is set
    });
  }

  async validate(payload: JwtPayload): Promise<user> {
    const user = await this.authService.validateUserSession(
      payload.sub,
      payload.sessionId,
    );
    if (!user) {
      throw new UnauthorizedException('Session expired or invalid');
    }
    return user;
  }
}
