import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/core/token'
import { prisma } from '@/lib/core/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const settings = await prisma.companySetting.findFirst({})
    return NextResponse.json({
      success: true,
      data: {
        showWatermark: settings?.salarySlipShowWatermark ?? false,
        watermarkText: settings?.salarySlipWatermarkText ?? '',
        headerText: settings?.salarySlipHeaderText ?? '',
        footerText: settings?.salarySlipFooterText ?? '',
        signatoryName: settings?.salarySlipSignatoryName ?? '',
        signatoryDesignation: settings?.salarySlipSignatoryDesig ?? '',
        primaryColor: settings?.salarySlipPrimaryColor ?? '#8B5CF6',
        showCompanyLogo: settings?.salarySlipShowLogo ?? true,
        showDualSignatures: settings?.salarySlipShowDualSignatures ?? false,
        secondSignatoryName: settings?.salarySlipSecondSignatory ?? '',
        secondSignatoryDesignation: settings?.salarySlipSecondSignatoryDesig ?? '',
      }
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || (token.role !== 'ADMIN' && token.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      showWatermark,
      watermarkText,
      headerText,
      footerText,
      signatoryName,
      signatoryDesignation,
      primaryColor,
      showCompanyLogo,
      showDualSignatures,
      secondSignatoryName,
      secondSignatoryDesignation,
    } = body

    const settings = await prisma.companySetting.findFirst({})

    const updateData = {
      salarySlipShowWatermark: showWatermark,
      salarySlipWatermarkText: watermarkText,
      salarySlipHeaderText: headerText,
      salarySlipFooterText: footerText,
      salarySlipSignatoryName: signatoryName,
      salarySlipSignatoryDesig: signatoryDesignation,
      salarySlipPrimaryColor: primaryColor,
      salarySlipShowLogo: showCompanyLogo,
      salarySlipShowDualSignatures: showDualSignatures,
      salarySlipSecondSignatory: secondSignatoryName,
      salarySlipSecondSignatoryDesig: secondSignatoryDesignation,
    }

    if (!settings) {
      // Create a default settings record with required fields
      await prisma.companySetting.create({
        data: { companyName: body.companyName || 'Company', ...updateData }
      })
    } else {
      await prisma.companySetting.update({
        where: { id: settings.id },
        data: updateData,
      })
    }

    return NextResponse.json({ success: true, message: 'Salary slip settings updated' })
  } catch (error) {
    console.error('PUT /api/settings/salary-slip error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
