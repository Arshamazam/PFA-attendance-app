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
  requiresGeofence: true,
  geofenceExemptReason: true,
  geofenceExemptedAt: true,
  geofenceExemptedBy: true,
  profilePhotoUrl: true,
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

  async findAll(page = 1, limit = 20, role?: string, search?: string, department?: string, status?: string) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deletedAt: null };
    if (role) where.role = role;
    if (department) where.department = department;
    if (status === 'active') where.active = true;
    else if (status === 'inactive') where.active = false;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { mobilePhone: { contains: search, mode: 'insensitive' } },
        { cnic: { contains: search, mode: 'insensitive' } },
        { department: { contains: search } },
      ];
    }
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

  async getDepartments() {
    const rows = await this.prisma.employee.findMany({
      where: { deletedAt: null, department: { not: null } },
      select: { department: true },
    });
    const unique = [...new Set(rows.map((r) => r.department).filter(Boolean))];
    return unique.sort() as string[];
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
        profilePhotoUrl: dto.profilePhotoUrl,
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

    // Core
    if (dto.name) data.name = dto.name;
    if (dto.email) data.email = dto.email;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    if (dto.role && requesterRole === 'admin') data.role = dto.role;

    // Personal
    if (dto.fathersName !== undefined) data.fathersName = dto.fathersName || null;
    if (dto.cnic !== undefined) data.cnic = dto.cnic || null;
    if (dto.dateOfBirth !== undefined) data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.gender !== undefined) data.gender = dto.gender || null;
    if (dto.maritalStatus !== undefined) data.maritalStatus = dto.maritalStatus || null;
    if (dto.religion !== undefined) data.religion = dto.religion || null;

    // Contact
    if (dto.mobilePhone !== undefined) data.mobilePhone = dto.mobilePhone || null;
    if (dto.landlinePhone !== undefined) data.landlinePhone = dto.landlinePhone || null;
    if (dto.addressStreet !== undefined) data.addressStreet = dto.addressStreet || null;
    if (dto.addressCity !== undefined) data.addressCity = dto.addressCity || null;
    if (dto.addressDistrict !== undefined) data.addressDistrict = dto.addressDistrict || null;
    if (dto.addressPostalCode !== undefined) data.addressPostalCode = dto.addressPostalCode || null;
    if (dto.emergencyContactName !== undefined) data.emergencyContactName = dto.emergencyContactName || null;
    if (dto.emergencyContactPhone !== undefined) data.emergencyContactPhone = dto.emergencyContactPhone || null;
    if (dto.emergencyContactRel !== undefined) data.emergencyContactRel = dto.emergencyContactRel || null;

    // Employment
    if (dto.dateOfJoining !== undefined) data.dateOfJoining = dto.dateOfJoining ? new Date(dto.dateOfJoining) : null;
    if (dto.department !== undefined) data.department = dto.department || null;
    if (dto.designation !== undefined) data.designation = dto.designation || null;
    if (dto.serviceCadre !== undefined) data.serviceCadre = dto.serviceCadre || null;
    if (dto.grade !== undefined) data.grade = dto.grade || null;
    if (dto.salary !== undefined) data.salary = dto.salary ? Number(dto.salary) : null;
    if (dto.shiftType !== undefined) data.shiftType = dto.shiftType || null;
    if (dto.employmentStatus !== undefined) data.employmentStatus = dto.employmentStatus || null;
    if (dto.reportingOfficerId !== undefined) data.reportingOfficerId = dto.reportingOfficerId || null;

    // Official
    if (dto.bankAccount !== undefined) data.bankAccount = dto.bankAccount || null;
    if (dto.iban !== undefined) data.iban = dto.iban || null;
    if (dto.tfn !== undefined) data.tfn = dto.tfn || null;
    if (dto.pensionAccount !== undefined) data.pensionAccount = dto.pensionAccount || null;
    if (dto.officeLocation !== undefined) data.officeLocation = dto.officeLocation || null;
    if (dto.badgeNumber !== undefined) data.badgeNumber = dto.badgeNumber || null;
    if (dto.geofenceZoneIds !== undefined && requesterRole === 'admin') {
      data.geofenceZoneIds = typeof dto.geofenceZoneIds === 'string'
        ? JSON.parse(dto.geofenceZoneIds as string)
        : dto.geofenceZoneIds;
    }

    // Documents & Media
    if (dto.profilePhotoUrl !== undefined) data.profilePhotoUrl = dto.profilePhotoUrl || null;
    if (dto.cnicCopyUrl !== undefined) data.cnicCopyUrl = dto.cnicCopyUrl || null;
    if (dto.degreeCertificateUrl !== undefined) data.degreeCertificateUrl = dto.degreeCertificateUrl || null;
    if (dto.medicalCertificateUrl !== undefined) data.medicalCertificateUrl = dto.medicalCertificateUrl || null;

    // System
    if (dto.active !== undefined) data.active = dto.active === 'true' || dto.active === true;

    const updated = await this.prisma.employee.update({
      where: { id },
      data,
      select: SAFE_SELECT,
    });

    this.logger.log(`Employee updated: ${updated.email} by ${requesterId}`);

    // Notify the employee about their profile change (visible in their mobile app)
    const FIELD_LABELS: Record<string, string> = {
      name: 'Name',
      email: 'Email',
      department: 'Department',
      designation: 'Designation',
      salary: 'Salary',
      grade: 'Grade',
      employmentStatus: 'Employment Status',
      active: 'Account Status',
      mobilePhone: 'Phone Number',
      officeLocation: 'Office Location',
      shiftType: 'Shift Type',
      badgeNumber: 'Badge Number',
      addressCity: 'City',
      addressStreet: 'Address',
    };
    const changedLabels = Object.keys(data)
      .map((k) => FIELD_LABELS[k])
      .filter(Boolean);
    const changedSummary =
      changedLabels.length > 0
        ? changedLabels.slice(0, 3).join(', ') +
          (changedLabels.length > 3 ? ` +${changedLabels.length - 3} more` : '')
        : 'profile details';

    await this.prisma.notification.create({
      data: {
        type: 'Profile Update',
        title: 'Your profile has been updated',
        message: `An administrator updated your ${changedSummary} on ${new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
        relatedEmployeeId: id,
        severity: 'Info',
      },
    });

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

  async getGeofenceStatus(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      select: { requiresGeofence: true, geofenceExemptReason: true, geofenceZoneIds: true },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return {
      requiresGeofence: emp.requiresGeofence,
      reason: emp.geofenceExemptReason,
      geofenceZoneIds: emp.geofenceZoneIds,
    };
  }

  async updateGeofenceRequirement(
    id: string,
    requiresGeofence: boolean,
    reason: string | undefined,
    exemptedById: string,
  ) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.employee.update({
      where: { id },
      data: {
        requiresGeofence,
        geofenceExemptReason: requiresGeofence ? null : (reason ?? null),
        geofenceExemptedAt: requiresGeofence ? null : new Date(),
        geofenceExemptedBy: requiresGeofence ? null : exemptedById,
      },
      select: SAFE_SELECT,
    });
  }
}
