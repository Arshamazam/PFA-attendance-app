import { Controller, Post, Body, HttpException, HttpStatus, Logger, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private logger = new Logger('AuthController');

  constructor(private authService: AuthService) {}

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

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    try {
      const result = await this.authService.login(body.email, body.password);
      return result;
    } catch (error) {
      this.logger.error('Login error:', error);
      throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
    }
  }
}
