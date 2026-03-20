import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes - no auth needed
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/setup',
    '/customer/page',
  ]

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Create Supabase client with cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get session
  const { data } = await supabase.auth.getSession()
  const session = data.session

  // Protected routes - require authentication
  if (pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // /admin/staff - only admin can access
    if (
      pathname === '/admin/staff' &&
      session.user.user_metadata?.role !== 'admin'
    ) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    return response
  }

  // Staff routes
  if (pathname.startsWith('/staff')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    const role = session.user.user_metadata?.role
    if (role !== 'staff' && role !== 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return response
  }

  // Report share routes — require any authenticated user
  // TODO: when customer-case linking is implemented, restrict customers to their own case reports
  if (pathname.startsWith('/reports')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    return response
  }

  // Customer routes
  if (pathname.startsWith('/customer')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    if (session.user.user_metadata?.role !== 'customer') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    return response
  }

  return response
}

export const config = {
  matcher: [
    // Match all paths except static files and api
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
