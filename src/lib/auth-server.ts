import { adminAuth } from './firebase-admin'
import { DecodedIdToken } from 'firebase-admin/auth'

/**
 * Verify a Firebase ID token on the server
 * @param token The ID token to verify
 * @returns The decoded token if valid, null otherwise
 */
export async function verifyIdToken(token: string): Promise<DecodedIdToken | null> {
  if (!adminAuth) {
    console.error('[Auth Server] Admin auth not initialized')
    return null
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error('[Auth Server] Token verification failed:', error)
    return null
  }
}

/**
 * Get user by email
 * @param email The email address
 * @returns The user record if found, null otherwise
 */
export async function getUserByEmail(email: string) {
  if (!adminAuth) {
    console.error('[Auth Server] Admin auth not initialized')
    return null
  }

  try {
    return await adminAuth.getUserByEmail(email)
  } catch {
    return null
  }
}

/**
 * Delete a user by UID
 * @param uid The user ID to delete
 */
export async function deleteUser(uid: string): Promise<boolean> {
  if (!adminAuth) {
    console.error('[Auth Server] Admin auth not initialized')
    return false
  }

  try {
    await adminAuth.deleteUser(uid)
    return true
  } catch (error) {
    console.error('[Auth Server] Failed to delete user:', error)
    return false
  }
}
