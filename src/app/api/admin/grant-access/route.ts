import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { stripe } from '@/lib/stripe'
import { verifyAuth, isAdmin, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()
    if (!isAdmin(user.email)) return forbiddenResponse()

    const { companyId, type } = await request.json()

    if (!companyId || !type || !['free-month', 'lifetime'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'companyId and type (free-month|lifetime) are required' },
        { status: 400 }
      )
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const companyRef = doc(db, 'companies', companyId)
    const companyDoc = await getDoc(companyRef)

    if (!companyDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      )
    }

    const companyData = companyDoc.data()
    const stripeSubId = companyData?.stripeSubscriptionId
    let stripeAction = 'none'

    if (type === 'free-month') {
      const newTrialEnd = new Date()
      newTrialEnd.setMonth(newTrialEnd.getMonth() + 1)

      // Update Stripe subscription if it exists
      if (stripe && stripeSubId) {
        try {
          await stripe.subscriptions.update(stripeSubId, {
            trial_end: Math.floor(newTrialEnd.getTime() / 1000),
            proration_behavior: 'none',
          })
          stripeAction = 'trial_extended'
        } catch (stripeError) {
          console.error('[Grant Access] Stripe trial update failed:', stripeError)
          stripeAction = 'stripe_error'
        }
      }

      // Always update Firestore
      await updateDoc(companyRef, {
        subscriptionStatus: 'trialing',
        trialEndsAt: Timestamp.fromDate(newTrialEnd),
        subscriptionTrialEnd: Math.floor(newTrialEnd.getTime() / 1000),
        grantedFreeAccess: true,
        grantedFreeAccessAt: Timestamp.now(),
        grantedFreeAccessBy: user.email,
      })

      return NextResponse.json({
        success: true,
        type: 'free-month',
        trialEndsAt: newTrialEnd.toISOString(),
        stripeAction,
      })
    }

    if (type === 'lifetime') {
      // Cancel Stripe subscription if it exists (no longer needed)
      if (stripe && stripeSubId) {
        try {
          await stripe.subscriptions.cancel(stripeSubId)
          stripeAction = 'subscription_cancelled'
        } catch (stripeError) {
          console.error('[Grant Access] Stripe cancellation failed:', stripeError)
          stripeAction = 'stripe_error'
        }
      }

      // Always update Firestore
      await updateDoc(companyRef, {
        subscriptionStatus: 'active',
        subscriptionTier: 'lifetime',
        lifetimeAccess: true,
        grantedLifetimeAt: Timestamp.now(),
        grantedLifetimeBy: user.email,
      })

      return NextResponse.json({
        success: true,
        type: 'lifetime',
        stripeAction,
      })
    }
  } catch (error) {
    console.error('[Grant Access] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to grant access' },
      { status: 500 }
    )
  }
}
