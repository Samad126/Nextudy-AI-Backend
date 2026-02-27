import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { DatabaseService } from '../../common/database/database.service.js';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
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

  // ─── Google OAuth hook (add provider logic here later) ──────────────────────
  // async googleLogin(profile: GoogleProfile) {
  //   let user = await this.db.user.findUnique({ where: { email: profile.email } });
  //   if (!user) {
  //     user = await this.db.user.create({ data: { ...profile, hashedPassword: null } });
  //   }
  //   const tokens = await this.generateTokens(user.id, user.email);
  //   await this.updateRefreshToken(user.id, tokens.refreshToken);
  //   return tokens;
  // }

  private async generateTokens(userId: number, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
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
