/**
 * Client-side authenticated fetch utility.
 * Automatically adds Firebase Auth ID token to requests.
 */

import { getAuth } from 'firebase/auth'

/**
 * Fetch wrapper that automatically includes the Firebase Auth ID token
 * in the Authorization header. Falls back to regular fetch if no user.
 */
export async function authFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const auth = getAuth()
  const currentUser = auth.currentUser

  const headers = new Headers(options?.headers)

  if (currentUser) {
    try {
      const token = await currentUser.getIdToken()
      headers.set('Authorization', `Bearer ${token}`)
    } catch {
      // Token refresh failed - proceed without auth
      // The API will return 401 and the user will be redirected to login
    }
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
