import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware to handle CORS for cross-origin API requests from admin.botsy.no.
 * 
 * This allows the admin panel (running on admin.botsy.no) to call
 * API routes on the main site (botsy.no).
 */

const ADMIN_URL = process.env.ADMIN_APP_URL || 'https://admin.botsy.no'

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'https://botsy.no',
  ADMIN_URL,
  // Development origins
  'http://localhost:3000',
  'http://localhost:3001',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect /admin/* to admin.botsy.no
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    // Map /admin/ansatte → admin.botsy.no/ansatte, /admin → admin.botsy.no/
    const adminPath = pathname.replace(/^\/admin/, '') || '/'
    const searchParams = request.nextUrl.search
    return NextResponse.redirect(`${ADMIN_URL}${adminPath}${searchParams}`, 301)
  }

  const origin = request.headers.get('origin')

  // Only handle CORS for API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Max-Age', '86400')

    return response
  }

  // For actual requests, add CORS headers to the response
  const response = NextResponse.next()

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  return response
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*', '/admin'],
}
