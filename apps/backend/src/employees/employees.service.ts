import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  fathersName: true,
  cnic: true,
  dateOfBirth: true,
  gender: true,
  maritalStatus: true,
  religion: true,
  mobilePhone: true,
  landlinePhone: true,
  addressStreet: true,
  addressCity: true,
  addressDistrict: true,
  addressPostalCode: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  emergencyContactRel: true,
  employeeCode: true,
  dateOfJoining: true,
  department: true,
  designation: true,
  serviceCadre: true,
  grade: true,
  salary: true,
  reportingOfficerId: true,
  shiftType: true,
  employmentStatus: true,
  bankAccount: true,
  iban: true,
  tfn: true,
  pensionAccount: true,
  officeLocation: true,
  badgeNumber: true,
  geofenceZoneIds: true,
  cnicCopyUrl: true,
  degreeCertificateUrl: true,
  medicalCertificateUrl: true,
  active: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, role?: string) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deletedAt: null };
    if (role) where.role = role;
    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        select: SAFE_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { data: employees, total, page, limit };
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
      select: SAFE_SELECT,
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }

    return employee;
  }

  async checkUnique(field: 'email' | 'cnic' | 'badgeNumber', value: string) {
    const where: Record<string, string> = { [field]: value };
    const existing = await this.prisma.employee.findFirst({ where });
    return { available: !existing };
  }

  async create(dto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    if (dto.cnic) {
      const cnicExists = await this.prisma.employee.findFirst({ where: { cnic: dto.cnic } });
      if (cnicExists) throw new ConflictException('CNIC already registered');
    }

    if (dto.badgeNumber) {
      const badgeExists = await this.prisma.employee.findFirst({ where: { badgeNumber: dto.badgeNumber } });
      if (badgeExists) throw new ConflictException('Badge number already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Auto-generate employee code if not provided
    const employeeCode = dto.employeeCode || `EMP-${Date.now().toString().slice(-6)}`;

    const employee = await this.prisma.employee.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role ?? 'employee',
        fathersName: dto.fathersName,
        cnic: dto.cnic,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        maritalStatus: dto.maritalStatus,
        religion: dto.religion,
        mobilePhone: dto.mobilePhone,
        landlinePhone: dto.landlinePhone,
        addressStreet: dto.addressStreet,
        addressCity: dto.addressCity,
        addressDistrict: dto.addressDistrict,
        addressPostalCode: dto.addressPostalCode,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        emergencyContactRel: dto.emergencyContactRel,
        employeeCode,
        dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : undefined,
        department: dto.department,
        designation: dto.designation,
        serviceCadre: dto.serviceCadre,
        grade: dto.grade,
        salary: dto.salary ? dto.salary : undefined,
        reportingOfficerId: dto.reportingOfficerId,
        shiftType: dto.shiftType,
        employmentStatus: dto.employmentStatus ?? 'Active',
        bankAccount: dto.bankAccount,
        iban: dto.iban,
        tfn: dto.tfn,
        pensionAccount: dto.pensionAccount,
        officeLocation: dto.officeLocation,
        badgeNumber: dto.badgeNumber,
        geofenceZoneIds: dto.geofenceZoneIds ?? [],
        cnicCopyUrl: dto.cnicCopyUrl,
        degreeCertificateUrl: dto.degreeCertificateUrl,
        medicalCertificateUrl: dto.medicalCertificateUrl,
        active: dto.active ?? true,
      },
      select: SAFE_SELECT,
    });

    this.logger.log(`Employee created: ${employee.email} (${employee.employeeCode})`);
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto, requesterId: string, requesterRole: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }

    if (requesterId !== id && requesterRole !== 'admin') {
      throw new ForbiddenException('Can only update your own profile');
    }

    const data: Record<string, unknown> = {};
    if (dto.name) data.name = dto.name;
    if (dto.email) data.email = dto.email;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    if (dto.role && requesterRole === 'admin') data.role = dto.role;

    const updated = await this.prisma.employee.update({
      where: { id },
      data,
      select: SAFE_SELECT,
    });

    this.logger.log(`Employee updated: ${updated.email} by ${requesterId}`);
    return updated;
  }

  async remove(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }

    await this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Employee soft-deleted: ${id}`);
    return { message: 'Employee deleted successfully' };
  }
}
