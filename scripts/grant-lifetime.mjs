/**
 * Grant lifetime access to a company (so its Botsy widget keeps answering
 * regardless of subscription status).
 *
 * Use this to re-enable the bot on botsy.no itself while the project is paused:
 *
 *   node scripts/grant-lifetime.mjs
 *
 * Or for any other company:
 *
 *   node scripts/grant-lifetime.mjs <companyId>
 *
 * Reads Firebase config from .env.local. Requires network access (run it
 * yourself in the terminal, e.g. with the `! node scripts/grant-lifetime.mjs`
 * prefix — it will not work from the sandboxed assistant).
 */
import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'

// botsy.no's own company (see src/app/layout.tsx)
const DEFAULT_COMPANY_ID = 'RjR6IBzbd2YX2TLFoXwuHzY2N3O2'
const companyId = process.argv[2] || DEFAULT_COMPANY_ID

// --- Load NEXT_PUBLIC_FIREBASE_* from .env.local ---
const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
})
const db = getFirestore(app)

const ref = doc(db, 'companies', companyId)
const snap = await getDoc(ref)

if (!snap.exists()) {
  console.error(`❌ Company not found: ${companyId}`)
  process.exit(1)
}

const before = snap.data()
console.log(`Company:               ${before.name || before.businessName || companyId}`)
console.log(`subscriptionStatus:    ${before.subscriptionStatus}`)
console.log(`lifetimeAccess (before): ${before.lifetimeAccess === true}`)

await updateDoc(ref, {
  subscriptionStatus: 'active',
  subscriptionTier: 'lifetime',
  lifetimeAccess: true,
  grantedLifetimeAt: Timestamp.now(),
  grantedLifetimeBy: 'grant-lifetime-script',
})

console.log('✅ lifetimeAccess set to true — the widget will answer again.')
process.exit(0)
