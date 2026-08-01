import { Controller, Post, Get, Body, HttpException, HttpStatus, Logger, ConflictException, UnauthorizedException, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  private logger = new Logger('AuthController');

  constructor(private authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: { id: string }) {
    return this.authService.getProfile(user.id);
  }

  @Post('signup')
  async signup(@Body() body: { email: string; password: string; name: string }) {
    try {
      const result = await this.authService.signup(body.email, body.password, body.name);
      return result;
    } catch (error) {
      this.logger.error(`Signup error for ${body.email}`, error.message);
      if (error.message?.includes('Unique constraint')) {
        throw new ConflictException('Email already registered');
      }
      throw new HttpException('Signup failed', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: { id: string },
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    if (!body.currentPassword || !body.newPassword) {
      throw new BadRequestException('currentPassword and newPassword are required');
    }
    if (body.newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }
    try {
      return await this.authService.changePassword(user.id, body.currentPassword, body.newPassword);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to change password', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    try {
      const result = await this.authService.login(body.email, body.password);
      return result;
    } catch (error) {
      // Re-throw JWT/auth errors as 401; bad credentials as 400
      if (error instanceof UnauthorizedException) {
        throw new HttpException('Invalid email or password', HttpStatus.BAD_REQUEST);
      }
      this.logger.error('Login error:', error);
      throw new HttpException('Invalid email or password', HttpStatus.BAD_REQUEST);
    }
  }
}
