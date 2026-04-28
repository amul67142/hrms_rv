export type Role = 'ADMIN' | 'HR_MANAGER' | 'EMPLOYEE'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'TEMPORARY'
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED'
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'RESIGNED' | 'TERMINATED' | 'ON_LEAVE'
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' | 'WEEK_OFF' | 'HOLIDAY' | 'LEAVE'
export type LeaveType = 'CASUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'BEREAVEMENT' | 'UNPAID' | 'COMPENSATORY' | 'WFH'
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type PayrollStatus = 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'LOCKED' | 'PAID'
export type ReimbursementStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'
export type ReimbursementCategory = 'TRAVEL' | 'MEALS' | 'EQUIPMENT' | 'MEDICAL' | 'OTHER'
export type Module = 'AUTH' | 'EMPLOYEE' | 'ATTENDANCE' | 'LEAVE' | 'PAYROLL' | 'HOLIDAY' | 'SETTINGS' | 'REPORT' | 'DASHBOARD' | 'REIMBURSEMENT'
export type Action = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT' | 'IMPORT' | 'APPROVE' | 'REJECT' | 'CANCEL' | 'LOCK' | 'UNLOCK' | 'PAY'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface User {
  id: string
  email: string
  role: Role
  employeeId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Employee {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  fatherName?: string | null
  email: string
  phone?: string | null
  department: string
  designation: string
  joiningDate: Date
  employmentType: EmploymentType
  gender?: Gender | null
  dateOfBirth?: Date | null
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  panNumber?: string | null
  aadhaarNumber?: string | null
  bankName?: string | null
  accountNumber?: string | null
  ifscCode?: string | null
  pfNumber?: string | null
  uanNumber?: string | null
  esiNumber?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  maritalStatus?: MaritalStatus | null
  status: EmployeeStatus
  profileImage?: string | null
  createdAt: Date
  updatedAt: Date
  user?: User
  salaryStructures?: SalaryStructure[]
}

export interface Attendance {
  id: string
  employeeId: string
  date: Date
  status: AttendanceStatus
  inTime?: string | null
  outTime?: string | null
  hoursWorked?: number | null
  remarks?: string | null
  createdAt: Date
  updatedAt: Date
  employee?: Employee
}

export interface LeaveRequest {
  id: string
  employeeId: string
  leaveType: LeaveType
  startDate: Date
  endDate: Date
  totalDays: number
  halfDay: boolean
  reason?: string | null
  status: LeaveStatus
  appliedAt?: Date | null
  approvedBy?: string | null
  approvedAt?: Date | null
  remarks?: string | null
  createdAt: Date
  updatedAt: Date
  employee?: Employee
}

export interface LeaveBalance {
  id: string
  employeeId: string
  leaveType: LeaveType
  year: number
  entitled: number
  taken: number
  pending: number
  available: number
  carryForward: number
  carryForwardMax: number
  createdAt: Date
  updatedAt: Date
}

export type AttendanceRegularizationType = 'LATE_ARRIVAL' | 'MISSED_PUNCH_IN' | 'MISSED_PUNCH_OUT' | 'OTHER'
export type AttendanceRegularizationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AttendanceRegularization {
  id: string
  employeeId: string
  date: Date
  type: AttendanceRegularizationType
  reason: string
  status: AttendanceRegularizationStatus
  approvedBy?: string | null
  approvedAt?: Date | null
  managerRemarks?: string | null
  deductions: number
  createdAt: Date
  updatedAt: Date
  employee?: Employee
}

export interface SalaryStructure {
  id: string
  employeeId: string
  effectiveFrom: Date
  effectiveTo?: Date | null
  basicSalary: number
  hra: number
  conveyanceAllowance: number
  medicalAllowance: number
  specialAllowance: number
  otherAllowance: number
  pfDeduction: number
  esiDeduction: number
  professionalTax: number
  otherDeduction: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PayrollItem {
  id: string
  employeeId: string
  month: number
  year: number
  basicSalary: number
  hra: number
  conveyanceAllowance: number
  medicalAllowance: number
  specialAllowance: number
  otherAllowance: number
  bonus: number
  incentives: number
  grossSalary: number
  pfDeduction: number
  esiDeduction: number
  professionalTax: number
  tdsDeduction: number
  otherDeduction: number
  totalDeduction: number
  netSalary: number
  paidDays: number
  unpaidLeaveDeduction?: number
  status: PayrollStatus
  paidAt?: Date | null
  lockedAt?: Date | null
  lockedBy?: string | null
  overrides?: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface CompanySettings {
  id: string
  companyName: string
  companyAddress?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  logo?: string | null
  registrationNumber?: string | null
  pan?: string | null
  tan?: string | null
  pfNumber?: string | null
  esiNumber?: string | null
  ptNumber?: string | null
  bankName?: string | null
  bankAccountNumber?: string | null
  bankAccountHolder?: string | null
  bankIfsc?: string | null
  logoUrl?: string | null
  workingDaysPerWeek: number
  shiftStartTime: string
  shiftEndTime: string
  halfDayHours: number
  monthlyLeaveEntitlement: number
  pfRate: number
  esiRate: number
  professionalTaxRate: number
  tdsRate: number
  leaveEncashmentRate: number
  footerText?: string | null
  signatoryName?: string | null
  signatoryDesignation?: string | null
  customLeaveTypes?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Holiday {
  id: string
  name: string
  date: Date
  year: number
  type?: string
  description?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AuditLog {
  id: string
  userId?: string | null
  employeeId?: string | null
  module: Module
  action: Action
  description: string
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: Date
  employee?: Employee | null
}

export interface SessionUser {
  id: string
  email: string
  role: Role
  employeeId: string | null
}

export interface BulkImportRow {
  row: number
  data: Record<string, unknown>
  errors: string[]
  isValid: boolean
}

export interface BulkImportResult {
  valid: BulkImportRow[]
  invalid: BulkImportRow[]
  totalValid: number
  totalInvalid: number
}

export interface AttendanceSummary {
  employeeId: string
  employeeCode: string
  employeeName: string
  department: string
  present: number
  absent: number
  halfDay: number
  weekOff: number
  holiday: number
  leave: number
  paidDays: number
}

export interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  presentToday: number
  absentToday: number
  pendingLeaveRequests: number
  totalDepartments: number
  latestPayrollMonth?: { month: number; year: number }
  employeesByDepartment: { department: string; count: number }[]
  attendanceTrend: { date: string; present: number; absent: number }[]
  recentLeaveRequests: LeaveRequest[]
}

export interface EmployeeDashboardStats {
  leaveBalance: LeaveBalance[]
  recentAttendance: Attendance[]
  recentLeaveRequests: LeaveRequest[]
  salarySlips: PayrollItem[]
}

export interface Reimbursement {
  id: string
  employeeId: string
  title: string
  description?: string | null
  amount: number
  category: ReimbursementCategory
  status: ReimbursementStatus
  receiptUrl?: string | null
  submittedAt: Date
  reviewedAt?: Date | null
  reviewedBy?: string | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
  employee?: Employee
}
