import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { extractJwtFromCookieOrHeader } from '../util/jwtExtractor.js';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../types/jwt-payload.type.js';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload; // { sub, email } → attached to request.user
  }
}
