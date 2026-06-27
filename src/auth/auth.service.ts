import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { Model } from 'mongoose';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con ese email.');
    }

    const password = await bcrypt.hash(registerDto.password, 12);
    const user = await this.usersService.createUser({
      ...registerDto,
      password,
    });

    return {
      user: this.serializeUser(user),
    };
  }

  async login(loginDto: LoginDto, response: Response) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    const accessToken = await this.signAccessToken(user);
    await this.issueRefreshToken(user.id, response);

    return {
      accessToken,
      user: this.serializeUser(user),
    };
  }

  async refresh(refreshToken: string | undefined, response: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token no proporcionado.');
    }

    const hashedToken = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokenModel.findOne({
      token: hashedToken,
    });

    if (!storedToken || storedToken.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token inválido o expirado.');
    }

    const user = await this.usersService.findById(storedToken.userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no autorizado.');
    }

    await this.refreshTokenModel.deleteOne({ _id: storedToken._id });
    const accessToken = await this.signAccessToken(user);
    await this.issueRefreshToken(user.id, response);

    return {
      accessToken,
      user: this.serializeUser(user),
    };
  }

  async logout(refreshToken: string | undefined, response: Response) {
    if (refreshToken) {
      await this.refreshTokenModel.deleteOne({
        token: this.hashToken(refreshToken),
      });
    }

    response.clearCookie('refreshToken', this.getCookieOptions());

    return {
      message: 'Sesión cerrada correctamente.',
    };
  }

  private async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email, true);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    return user;
  }

  private async signAccessToken(user: UserDocument) {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        roles: user.roles,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn:
          (this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') as
            StringValue | undefined) ?? '15m',
      },
    );
  }

  private async issueRefreshToken(userId: string, response: Response) {
    const rawToken = randomBytes(48).toString('hex');
    const refreshTokenDays = Number(
      this.configService.get('REFRESH_TOKEN_DAYS') ?? 7,
    );
    const expiresAt = new Date(
      Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000,
    );

    await this.refreshTokenModel.create({
      userId,
      token: this.hashToken(rawToken),
      expiresAt,
    });

    response.cookie('refreshToken', rawToken, {
      ...this.getCookieOptions(),
      expires: expiresAt,
    });
  }

  private getCookieOptions() {
    return {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };
  }

  private hashToken(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private serializeUser(user: UserDocument) {
    const plainUser = user.toObject({ versionKey: false }) as Record<
      string,
      unknown
    >;
    delete plainUser.password;

    return plainUser;
  }
}
