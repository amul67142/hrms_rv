/**
 * cleanup.ts — Deletes all transactional/dummy data from the DB.
 * KEEPS: users, employees, departments, company_settings, smtp_settings, essl_settings
 * DELETES: attendance, leave, payroll, salary, documents, tasks, tickets,
 *          announcements, notifications, letters, resignations, reimbursements,
 *          learning, tools, holidays, audit_logs, login_sessions, essl_sync_logs
 *
 * Run: npx tsx prisma/cleanup.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Starting database cleanup...\n')
  console.log('📌 Keeping: users, employees, departments, company_settings, smtp_settings, essl_settings\n')

  // ─── Delete in FK-safe order (children first) ────────────────────────────

  // 1. Login sessions (references User)
  const loginSessions = await prisma.loginSession.deleteMany()
  console.log(`✅ Deleted ${loginSessions.count} login sessions`)

  // 2. Audit logs (references User + Employee)
  const auditLogs = await prisma.auditLog.deleteMany()
  console.log(`✅ Deleted ${auditLogs.count} audit logs`)

  // 3. Payroll items (references Employee)
  const payrollItems = await prisma.payrollItem.deleteMany()
  console.log(`✅ Deleted ${payrollItems.count} payroll items`)

  // 4. Salary structures (references Employee)
  const salaryStructures = await prisma.salaryStructure.deleteMany()
  console.log(`✅ Deleted ${salaryStructures.count} salary structures`)

  // 5. Leave balances (references Employee)
  const leaveBalances = await prisma.leaveBalance.deleteMany()
  console.log(`✅ Deleted ${leaveBalances.count} leave balances`)

  // 6. Leave requests (references Employee)
  const leaveRequests = await prisma.leaveRequest.deleteMany()
  console.log(`✅ Deleted ${leaveRequests.count} leave requests`)

  // 7. Attendance regularizations (references Employee)
  const regularizations = await prisma.attendanceRegularization.deleteMany()
  console.log(`✅ Deleted ${regularizations.count} attendance regularizations`)

  // 8. Attendance records (references Employee)
  const attendance = await prisma.attendance.deleteMany()
  console.log(`✅ Deleted ${attendance.count} attendance records`)

  // 9. Notifications (references Employee)
  const notifications = await prisma.notification.deleteMany()
  console.log(`✅ Deleted ${notifications.count} notifications`)

  // 10. Tasks (references Employee + Department)
  const tasks = await prisma.task.deleteMany()
  console.log(`✅ Deleted ${tasks.count} tasks`)

  // 11. Resignations (references Employee)
  const resignations = await prisma.resignation.deleteMany()
  console.log(`✅ Deleted ${resignations.count} resignations`)

  // 12. Support tickets (references Employee)
  const tickets = await prisma.ticket.deleteMany()
  console.log(`✅ Deleted ${tickets.count} tickets`)

  // 13. HR letters (references Employee)
  const letters = await prisma.hRLetter.deleteMany()
  console.log(`✅ Deleted ${letters.count} HR letters`)

  // 14. Employee documents (references Employee)
  const documents = await prisma.employeeDocument.deleteMany()
  console.log(`✅ Deleted ${documents.count} employee documents`)

  // 15. Reimbursements (references Employee)
  const reimbursements = await prisma.reimbursement.deleteMany()
  console.log(`✅ Deleted ${reimbursements.count} reimbursements`)

  // 16. Learning progress
  const learningProgress = await prisma.learningProgress.deleteMany()
  console.log(`✅ Deleted ${learningProgress.count} learning progress records`)

  // 17. Learning modules
  const learningModules = await prisma.learningModule.deleteMany()
  console.log(`✅ Deleted ${learningModules.count} learning modules`)

  // 18. Tools
  const tools = await prisma.tool.deleteMany()
  console.log(`✅ Deleted ${tools.count} tools`)

  // 19. Announcements
  const announcements = await prisma.announcement.deleteMany()
  console.log(`✅ Deleted ${announcements.count} announcements`)

  // 20. Holidays
  const holidays = await prisma.holiday.deleteMany()
  console.log(`✅ Deleted ${holidays.count} holidays`)

  // 21. ESSL sync logs
  const esslLogs = await prisma.esslSyncLog.deleteMany()
  console.log(`✅ Deleted ${esslLogs.count} ESSL sync logs`)

  // ─── Summary ────────────────────────────────────────────────────────────
  console.log('\n────────────────────────────────')
  console.log('✨ Cleanup complete!')
  console.log('────────────────────────────────')

  // Show what was kept
  const userCount = await prisma.user.count()
  const employeeCount = await prisma.employee.count()
  const deptCount = await prisma.department.count()
  const settingsCount = await prisma.companySetting.count()

  console.log('\n📊 Remaining records (kept):')
  console.log(`  👤 Users:            ${userCount}`)
  console.log(`  👥 Employees:        ${employeeCount}`)
  console.log(`  🏢 Departments:      ${deptCount}`)
  console.log(`  ⚙️  Company settings: ${settingsCount}`)
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
