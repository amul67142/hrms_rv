import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Loading active employees and database SMTP configuration...')

  // 1. Fetch SMTP settings
  const settings = await prisma.smtpSetting.findFirst()
  if (!settings || !settings.enabled) {
    console.error('❌ Error: SMTP settings are not configured or are disabled in the database.')
    console.log('Please enable and configure SMTP in the Admin Panel settings first.')
    await prisma.$disconnect()
    process.exit(1)
  }

  console.log(`✅ SMTP Settings loaded: Host: ${settings.host}, From: ${settings.fromName} <${settings.fromEmail}>`)

  // 2. Fetch all active employees
  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    include: { user: true }
  })

  if (employees.length === 0) {
    console.log('ℹ️ No active employees found in the database.')
    await prisma.$disconnect()
    process.exit(0)
  }

  console.log(`📋 Found ${employees.length} active employees. Starting email dispatch process...\n`)

  // Create standard nodemailer transporter
  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: {
      user: settings.username,
      pass: settings.password,
    },
  })

  const appUrl = process.env.APP_URL || 'https://palegoldenrod-clam-655178.hostingersite.com'
  const sentList: Array<{
    code: string
    name: string
    email: string
    passwordText: string
    status: 'SENT' | 'FAILED'
    error?: string
  }> = []

  for (const emp of employees) {
    const fullName = `${emp.firstName} ${emp.lastName}`
    const tempPassword = `RealVibe@${Math.floor(1000 + Math.random() * 9000)}`
    const hashed = await bcrypt.hash(tempPassword, 10)

    try {
      // 3. Update or Create User Account
      if (emp.user) {
        await prisma.user.update({
          where: { id: emp.user.id },
          data: { password: hashed }
        })
      } else {
        await prisma.user.create({
          data: {
            email: emp.email,
            password: hashed,
            role: 'EMPLOYEE',
            employeeId: emp.id
          }
        })
      }

      // 4. Generate HTML Email Template (Sleek Dark Mode matching guidelines)
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Realvibe HRM</title>
</head>
<body style="margin:0;padding:0;background-color:#0F0F0F;font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#1A1A1A;border-radius:16px;padding:40px;border:1px solid #2D2D2D;box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);">
      <div style="text-align:center;margin-bottom:35px;">
        <h1 style="color:#8B5CF6;font-size:26px;margin:0;font-weight:700;letter-spacing:-0.5px;">Realvibe HRM</h1>
        <p style="color:#9CA3AF;font-size:14px;margin:8px 0 0;letter-spacing:1px;text-transform:uppercase;">Human Resource Management</p>
      </div>
      <div style="color:#E5E7EB;font-size:15px;line-height:1.7;">
        <p style="margin-top:0;">Dear <strong>${fullName}</strong>,</p>
        <p>Your official employee portal account has been prepared and activated. You can now log in to access your dashboard, track attendance, manage leaves, view salary slips, and more.</p>
        
        <div style="background:#262626;border-radius:12px;padding:24px;margin:25px 0;border:1px solid #333333;">
          <h3 style="color:#FFFFFF;margin:0 0 16px 0;font-size:16px;border-bottom:1px solid #3A3A3A;padding-bottom:8px;">Your Login Credentials</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="color:#9CA3AF;padding:8px 0;font-weight:500;">Employee Code:</td>
              <td style="color:#FFFFFF;padding:8px 0;text-align:right;font-weight:600;">${emp.employeeCode}</td>
            </tr>
            <tr>
              <td style="color:#9CA3AF;padding:8px 0;font-weight:500;">Portal Username / Email:</td>
              <td style="color:#FFFFFF;padding:8px 0;text-align:right;font-weight:600;font-family:monospace;">${emp.email}</td>
            </tr>
            <tr>
              <td style="color:#9CA3AF;padding:8px 0;font-weight:500;">Temporary Password:</td>
              <td style="color:#8B5CF6;padding:8px 0;text-align:right;font-weight:700;font-size:16px;font-family:monospace;">${tempPassword}</td>
            </tr>
          </table>
        </div>

        <div style="text-align:center;margin:30px 0;">
          <a href="${appUrl}" style="display:inline-block;background:#8B5CF6;color:#FFFFFF;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);transition: all 0.2s ease;">
            Log In to Portal
          </a>
        </div>
        
        <p style="font-size:13px;color:#9CA3AF;background:#2A2535;padding:12px 16px;border-radius:8px;border-left:4px solid #8B5CF6;margin:20px 0 0;">
          <strong>Security Note:</strong> For security purposes, please change this temporary password immediately after logging in by going to your Profile settings.
        </p>
      </div>
      <div style="margin-top:40px;padding-top:25px;border-top:1px solid #2D2D2D;text-align:center;">
        <p style="color:#9CA3AF;font-size:12px;margin:0;">This is an authorized administrative email from Realvibe HRM.</p>
      </div>
    </div>
  </div>
</body>
</html>`

      // 5. Send Mail
      await transporter.sendMail({
        from: `"${settings.fromName}" <${settings.fromEmail}>`,
        to: emp.email,
        subject: 'Your Realvibe HRM Portal Login Credentials',
        html: htmlContent,
      })

      console.log(`✉️ Credentials successfully sent to: ${fullName} (${emp.email}) -> Password: ${tempPassword}`)
      sentList.push({
        code: emp.employeeCode,
        name: fullName,
        email: emp.email,
        passwordText: tempPassword,
        status: 'SENT'
      })

    } catch (err: any) {
      console.error(`❌ Failed processing credentials for ${fullName} (${emp.email}):`, err.message)
      sentList.push({
        code: emp.employeeCode,
        name: fullName,
        email: emp.email,
        passwordText: tempPassword,
        status: 'FAILED',
        error: err.message
      })
    }
  }

  // 6. Write to Desktop file for user
  const desktopPath = 'C:\\Users\\Hp\\Desktop\\credentials-list.txt'
  let listOutput = `=================================================================\n`
  listOutput += `          REALVIBE HRM ACTIVE EMPLOYEES LOGIN CREDENTIALS       \n`
  listOutput += `          Generated on: ${new Date().toLocaleString()}            \n`
  listOutput += `=================================================================\n\n`
  
  listOutput += String().padEnd(10, ' ') + ' | ' + String().padEnd(25, ' ') + ' | ' + String().padEnd(30, ' ') + ' | ' + String().padEnd(16, ' ') + ' | ' + 'Status\n'
  listOutput += '-'.repeat(10) + ' | ' + '-'.repeat(25) + ' | ' + '-'.repeat(30) + ' | ' + '-'.repeat(16) + ' | ' + '-'.repeat(8) + '\n'

  for (const item of sentList) {
    listOutput += `${item.code.padEnd(10, ' ')} | ${item.name.padEnd(25, ' ')} | ${item.email.padEnd(30, ' ')} | ${item.passwordText.padEnd(16, ' ')} | ${item.status}\n`
  }

  fs.writeFileSync(desktopPath, listOutput)
  console.log(`\n💾 Saved credentials details list to Desktop: ${desktopPath}`)

  await prisma.$disconnect()
  console.log('🏁 Process complete!')
}

main().catch(async (e) => {
  console.error('💥 Critical script execution error:', e)
  await prisma.$disconnect()
  process.exit(1)
})
