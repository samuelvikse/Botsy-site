import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/facebook-oauth'

/**
 * GET /api/auth/facebook
 *
 * Starts the Facebook OAuth flow for connecting Instagram or Messenger
 *
 * Query params:
 * - channel: 'instagram' | 'messenger'
 * - companyId: The company ID to connect the channel to
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const channel = searchParams.get('channel') as 'instagram' | 'messenger' | null
    const companyId = searchParams.get('companyId')

    // Validate parameters
    if (!channel || !['instagram', 'messenger'].includes(channel)) {
      return NextResponse.json(
        { error: 'Invalid channel. Must be "instagram" or "messenger"' },
        { status: 400 }
      )
    }

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Build redirect URI (must match what's registered in Facebook App)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const redirectUri = `${baseUrl}/api/auth/facebook/callback`

    // Get Facebook OAuth URL
    const authUrl = getAuthUrl({
      channel,
      companyId,
      redirectUri,
    })

    // Redirect to Facebook
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('[Facebook OAuth] Error starting auth flow:', error)
    return NextResponse.json(
      { error: 'Failed to start Facebook authentication' },
      { status: 500 }
    )
  }
}
