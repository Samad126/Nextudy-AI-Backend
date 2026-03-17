import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { DatabaseService } from '../../common/database/database.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await argon2.hash(dto.password);
    const user = await this.db.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        hashedPassword,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async validateUser(email: string, password: string) {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user || !user.hashedPassword)
      throw new UnauthorizedException('Invalid credentials');

    const isValid = await argon2.verify(user.hashedPassword, password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async login(userId: number, email: string) {
    const tokens = await this.generateTokens(userId, email);
    await this.updateRefreshToken(userId, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: number) {
    await this.db.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
  }

  async refreshTokens(userId: number, email: string, refreshToken: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || !user.hashedRefreshToken)
      throw new ForbiddenException('Access denied');

    const isValid = await argon2.verify(user.hashedRefreshToken, refreshToken);
    if (!isValid) throw new ForbiddenException('Access denied');

    const tokens = await this.generateTokens(userId, email);
    await this.updateRefreshToken(userId, tokens.refreshToken);
    return tokens;
  }

  async googleLogin(accessToken: string) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) throw new BadRequestException('Invalid Google access token');

    const {
      sub: googleId,
      email,
      given_name,
      family_name,
    } = (await res.json()) as {
      sub: string;
      email: string;
      given_name?: string;
      family_name?: string;
    };

    if (!googleId || !email)
      throw new BadRequestException('Invalid Google token');

    let user = await this.db.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (!user) {
      user = await this.db.user.create({
        data: {
          googleId,
          email,
          firstName: given_name ?? '',
          lastName: family_name ?? '',
        },
      });
    } else if (!user.googleId) {
      user = await this.db.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  private async generateTokens(userId: number, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: '1d',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: number, refreshToken: string) {
    const hashed = await argon2.hash(refreshToken);
    await this.db.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: hashed },
    });
  }
}
