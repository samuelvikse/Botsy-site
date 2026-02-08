import { NextRequest, NextResponse } from 'next/server'
import { incrementPositiveFeedback, incrementAnsweredCustomers } from '@/lib/leaderboard-firestore'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function POST(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  try {
    const { userId, companyId, type } = await request.json()

    if (!userId || !companyId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId)
    if (!access) return forbiddenResponse()

    if (type === 'positive_feedback') {
      await incrementPositiveFeedback(userId, companyId)
    } else if (type === 'answered_customer') {
      await incrementAnsweredCustomers(userId, companyId)
    } else {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to update leaderboard' },
      { status: 500 }
    )
  }
}
