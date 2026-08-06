export interface Employee {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
  employeeCode?: string;
  designation?: string;
  department?: string;
  wing?: string;
  addressDistrict?: string;
  mobilePhone?: string;
  profilePhotoUrl?: string | null;
  active?: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface GeofenceZone {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee?: { id: string; name: string; email: string };
  checkInTime: string;
  checkOutTime: string | null;
  checkInLat: number;
  checkInLng: number;
  checkInPhotoUrl: string | null;
  checkOutPhotoUrl: string | null;
  geofenceZoneId: string;
  geofenceZone?: { id: string; name: string };
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: { id: string; name: string; email: string };
  startDate: string;
  endDate: string;
  reason: string;
  leaveType: string;
  status: "pending" | "approved" | "rejected";
  approvedBy: string | null;
  approver?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
