export interface SalaryInput {
  employeeId: string
  basicSalary: number
  hra: number
  conveyanceAllowance: number
  medicalAllowance: number
  specialAllowance: number
  otherAllowance: number
  bonus: number
  incentives: number
  pfDeduction: number
  esiDeduction: number
  professionalTax: number
  tdsDeduction: number
  otherDeduction: number
  workingDays: number
  paidDays: number
  absentDays: number
  halfDays: number
  weekOffs: number
  holidays: number
  unpaidLeaveDays: number
}

export interface SalaryOutput {
  basicSalary: number
  hra: number
  conveyanceAllowance: number
  medicalAllowance: number
  specialAllowance: number
  otherAllowance: number
  bonus: number
  incentives: number
  totalEarnings: number
  pfDeduction: number
  esiDeduction: number
  professionalTax: number
  tdsDeduction: number
  unpaidLeaveDeduction: number
  otherDeduction: number
  totalDeductions: number
  grossSalary: number
  netSalary: number
  workingDays: number
  paidDays: number
  absentDays: number
  halfDays: number
  weekOffs: number
  holidays: number
  unpaidLeaveDays: number
}

export function calculateSalary(input: SalaryInput): SalaryOutput {
  const totalEarnings =
    input.basicSalary +
    input.hra +
    input.conveyanceAllowance +
    input.medicalAllowance +
    input.specialAllowance +
    input.otherAllowance +
    input.bonus +
    input.incentives

  const perDaySalary = input.basicSalary / input.workingDays
  const unpaidLeaveDeduction = perDaySalary * input.unpaidLeaveDays

  const totalDeductions =
    input.pfDeduction +
    input.esiDeduction +
    input.professionalTax +
    input.tdsDeduction +
    unpaidLeaveDeduction +
    input.otherDeduction

  const grossSalary = totalEarnings
  const netSalary = grossSalary - totalDeductions

  return {
    basicSalary: input.basicSalary,
    hra: input.hra,
    conveyanceAllowance: input.conveyanceAllowance,
    medicalAllowance: input.medicalAllowance,
    specialAllowance: input.specialAllowance,
    otherAllowance: input.otherAllowance,
    bonus: input.bonus,
    incentives: input.incentives,
    totalEarnings,
    pfDeduction: input.pfDeduction,
    esiDeduction: input.esiDeduction,
    professionalTax: input.professionalTax,
    tdsDeduction: input.tdsDeduction,
    unpaidLeaveDeduction,
    otherDeduction: input.otherDeduction,
    totalDeductions,
    grossSalary,
    netSalary,
    workingDays: input.workingDays,
    paidDays: input.paidDays,
    absentDays: input.absentDays,
    halfDays: input.halfDays,
    weekOffs: input.weekOffs,
    holidays: input.holidays,
    unpaidLeaveDays: input.unpaidLeaveDays,
  }
}

export function calculatePF(employeeBasic: number): {
  employeePF: number
  employerPF: number
} {
  const employeePF = Math.min(employeeBasic * 0.12, 1800)
  const employerPF = employeePF
  return { employeePF, employerPF }
}

export function calculateESI(employeeGross: number): {
  employeeESI: number
  employerESI: number
} {
  if (employeeGross > 21000) return { employeeESI: 0, employerESI: 0 }
  const employeeESI = Math.round(employeeGross * 0.0075 * 100) / 100
  const employerESI = Math.round(employeeGross * 0.0325 * 100) / 100
  return { employeeESI, employerESI }
}

export function calculateProfessionalTax(monthlyGross: number): number {
  if (monthlyGross <= 10000) return 0
  if (monthlyGross <= 15000) return 110
  return 200
}

export function calculateTDS(annualIncome: number): number {
  if (annualIncome <= 300000) return 0
  if (annualIncome <= 600000) return (annualIncome - 300000) * 0.05
  if (annualIncome <= 900000) return 15000 + (annualIncome - 600000) * 0.1
  if (annualIncome <= 1200000) return 45000 + (annualIncome - 900000) * 0.15
  return 90000 + (annualIncome - 1200000) * 0.2
}

export function calculateArrears(
  basicSalary: number,
  previousBasic: number,
  month: number,
  year: number
): { basicArrears: number; totalArrears: number } {
  if (basicSalary <= previousBasic) {
    return { basicArrears: 0, totalArrears: 0 }
  }
  const basicDiff = basicSalary - previousBasic
  const hraDiff = basicDiff * 0.4
  const totalArrears = basicDiff + hraDiff
  return { basicArrears: basicDiff, totalArrears }
}

export function calculateGratuity(
  yearsOfService: number,
  lastBasicSalary: number,
  lastHra: number
): number {
  if (yearsOfService < 5) return 0
  const monthlySalary = lastBasicSalary + lastHra
  const gratuity = (monthlySalary * yearsOfService * 15) / 26
  return Math.round(gratuity * 100) / 100
}

export function calculateLeaveEncashment(
  availableDays: number,
  dailyRate: number,
  maxEncashableDays: number = 15
): number {
  const encashableDays = Math.min(availableDays, maxEncashableDays)
  return Math.round(encashableDays * dailyRate * 100) / 100
}
