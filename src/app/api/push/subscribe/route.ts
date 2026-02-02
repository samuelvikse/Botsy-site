import { NextRequest, NextResponse } from 'next/server'
import {
  savePushSubscription,
  deactivatePushSubscription,
  getPushSubscriptionByUser,
} from '@/lib/escalation-firestore'

export async function POST(request: NextRequest) {
  try {
    const { userId, companyId, subscription } = await request.json()

    if (!userId || !companyId || !subscription) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Deactivate any existing subscriptions for this user
    await deactivatePushSubscription(userId)

    // Save new subscription
    const subscriptionId = await savePushSubscription(userId, companyId, subscription)

    return NextResponse.json({ success: true, subscriptionId })
  } catch (error) {
    console.error('Error saving push subscription:', error)
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    await deactivatePushSubscription(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deactivating push subscription:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate subscription' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const subscription = await getPushSubscriptionByUser(userId)

    return NextResponse.json({ hasSubscription: !!subscription })
  } catch (error) {
    console.error('Error checking push subscription:', error)
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    )
  }
}
