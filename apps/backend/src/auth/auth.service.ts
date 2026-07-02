import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async signup(email: string, password: string, name: string) {
    const hashedPassword = await this.hashPassword(password);
    
    const employee = await this.prisma.employee.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'employee',
      },
    });

    const token = this.jwtService.sign({
      sub: employee.id,
      email: employee.email,
      role: employee.role,
    });

    return { token, employee: { id: employee.id, email: employee.email, name: employee.name } };
  }

  async login(email: string, password: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { email },
    });

    if (!employee) {
      throw new Error('Invalid email or password');
    }

    const passwordValid = await this.validatePassword(password, employee.password);
    if (!passwordValid) {
      throw new Error('Invalid email or password');
    }

    const token = this.jwtService.sign({
      sub: employee.id,
      email: employee.email,
      role: employee.role,
    });

    return { token, employee: { id: employee.id, email: employee.email, name: employee.name } };
  }

  async getProfile(id: string) {
    return this.prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        department: true,
        employeeCode: true,
        profilePhotoUrl: true,
        geofenceZoneIds: true,
        active: true,
      },
    });
  }

  async validateToken(payload: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: payload.sub },
    });
    return employee || null;
  }
}
