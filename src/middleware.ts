import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes - no auth needed
  const publicRoutes = ['/', '/auth/login', '/auth/setup', '/unauthorized']
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Create Supabase client with cookies
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data } = await supabase.auth.getSession()
  const session = data.session
  const role = session?.user.user_metadata?.role as string | undefined

  const unauthorized = (from: string) =>
    NextResponse.redirect(new URL(`/unauthorized?from=${encodeURIComponent(from)}`, request.url))

  // /admin — admin only
  if (pathname.startsWith('/admin')) {
    if (!session) return NextResponse.redirect(new URL('/auth/login', request.url))
    if (role !== 'admin') return unauthorized(pathname)
    return response
  }

  // /staff — staff only (admin은 /admin 사용)
  if (pathname.startsWith('/staff')) {
    if (!session) return NextResponse.redirect(new URL('/auth/login', request.url))
    if (role !== 'staff') return unauthorized(pathname)
    return response
  }

  // /reports — any authenticated user
  if (pathname.startsWith('/reports')) {
    if (!session) return NextResponse.redirect(new URL('/auth/login', request.url))
    return response
  }

  // /customer — customer only
  if (pathname.startsWith('/customer')) {
    if (!session) return NextResponse.redirect(new URL('/auth/login', request.url))
    if (role !== 'customer') return unauthorized(pathname)
    return response
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
