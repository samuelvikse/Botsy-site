/**
 * Kill-switch for new signups and purchases while the project is on pause.
 *
 * Set NEXT_PUBLIC_SIGNUP_PAUSED=true to:
 *  - block new self-serve account creation on /registrer
 *  - block Stripe checkout / subscription creation
 *
 * Existing customers are UNAFFECTED: their widgets only check their own
 * company's subscriptionStatus, and invited team members can still register.
 *
 * NEXT_PUBLIC_ vars are inlined at build time and are readable both in the
 * browser and on the server, so this single flag covers UI and API routes.
 */
export const SIGNUP_PAUSED = process.env.NEXT_PUBLIC_SIGNUP_PAUSED === 'true'
