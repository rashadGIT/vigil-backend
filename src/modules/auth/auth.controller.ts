import { Body, Controller, Get, Headers, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiResponse({ status: 200, description: 'Returns access token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string }> {
    return this.authService.login(dto.email, dto.password, response);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh_token cookie' })
  @ApiResponse({ status: 200, description: 'Returns new access token' })
  @ApiResponse({ status: 401, description: 'Missing or invalid refresh token' })
  refresh(@Req() request: Request): Promise<{ accessToken: string }> {
    const token = request.cookies?.['refresh_token'] as string | undefined;
    if (!token) {
      throw new Error('Missing refresh_token cookie');
    }
    return this.authService.refresh(token);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  me(@Req() request: Request): {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  } {
    const user = (
      request as Request & {
        user: { sub: string; email: string; tenantId: string; role: string };
      }
    ).user;
    return {
      id: user.sub,
      email: user.email,
      name: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
  }

  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Logout and invalidate the current session' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  logout(
    @Headers('authorization') auth: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ ok: true }> {
    const accessToken = auth?.replace('Bearer ', '') ?? '';
    return this.authService.logout(accessToken, response);
  }
}
