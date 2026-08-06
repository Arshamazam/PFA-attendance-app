export class UpdateEmployeeDto {
  // Core
  name?: string;
  email?: string;
  password?: string;
  role?: string;

  // Personal
  fathersName?: string;
  cnic?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  religion?: string;

  // Contact
  mobilePhone?: string;
  landlinePhone?: string;
  addressStreet?: string;
  addressCity?: string;
  addressDistrict?: string;
  addressPostalCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRel?: string;

  // Employment
  dateOfJoining?: string;
  department?: string;
  wing?: string;
  designation?: string;
  serviceCadre?: string;
  grade?: string;
  salary?: string | number;
  shiftType?: string;
  employmentStatus?: string;
  reportingOfficerId?: string;

  // Official
  bankAccount?: string;
  iban?: string;
  tfn?: string;
  pensionAccount?: string;
  officeLocation?: string;
  badgeNumber?: string;
  geofenceZoneIds?: string[];

  // Documents & Media
  profilePhotoUrl?: string;
  cnicCopyUrl?: string;
  degreeCertificateUrl?: string;
  medicalCertificateUrl?: string;

  // System
  active?: boolean | string;
}
