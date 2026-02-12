import { NextRequest, NextResponse } from 'next/server'
import { getLeaderboard, getAllPerformances, getCurrentMonth } from '@/lib/leaderboard-firestore'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

// Force dynamic rendering (uses request.url)
export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function GET(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const topCount = parseInt(searchParams.get('topCount') || '3', 10)
    const includeAll = searchParams.get('includeAll') === 'true'

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId, user.token)
    if (!access) return forbiddenResponse()

    const month = getCurrentMonth()

    if (includeAll) {
      const performances = await getAllPerformances(companyId, month)
      return NextResponse.json({
        performances,
        month,
        monthName: getMonthName(month)
      }, {
        headers: {
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
        }
      })
    }

    const leaderboard = await getLeaderboard(companyId, topCount, month)
    return NextResponse.json({
      leaderboard,
      month,
      monthName: getMonthName(month)
    }, {
      headers: {
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
      }
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}

function getMonthName(month: string): string {
  const months = [
    'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
  ]
  const monthIndex = parseInt(month.split('-')[1], 10) - 1
  return months[monthIndex]
}
