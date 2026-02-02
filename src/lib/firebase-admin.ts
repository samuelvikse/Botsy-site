import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getAuth, Auth } from 'firebase-admin/auth'

let adminApp: App | null = null
let adminDb: Firestore | null = null
let adminAuth: Auth | null = null

function initializeAdminApp() {
  if (getApps().length > 0) {
    adminApp = getApps()[0]
  } else {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

    if (!serviceAccountKey) {
      console.warn('[Firebase Admin] No service account key found')
      return
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountKey)
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      })
    } catch (error) {
      console.error('[Firebase Admin] Failed to initialize:', error)
      return
    }
  }

  adminDb = getFirestore(adminApp)
  adminAuth = getAuth(adminApp)
}

// Initialize on module load
initializeAdminApp()

export { adminApp, adminDb, adminAuth }
