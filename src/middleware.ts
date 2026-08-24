import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files from /public — without this, unauthenticated requests
  // for images/fonts get redirected to /auth/signin, returning HTML to the
  // browser instead of the file (breaking images on first load).
  if (/\.[^/]+$/.test(pathname)) {
    return NextResponse.next()
  }

  // Allow auth routes through without a session check
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/gmail/webhook') ||
    pathname.startsWith('/api/gmail/poll') ||
    pathname.startsWith('/api/cron') ||
    // Called by another server with a shared secret, never by a browser with
    // a session. Without this the middleware would redirect it to sign-in and
    // the caller would get an HTML page where it expected JSON.
    pathname.startsWith('/api/external') ||
    pathname.startsWith('/api/debug')
  ) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/signin'
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
