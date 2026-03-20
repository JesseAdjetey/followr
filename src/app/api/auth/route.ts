// Auth is now initiated client-side via supabase.auth.signInWithOAuth()
// This route is no longer used.
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET(req: Request) {
  const url = new URL('/', req.url)
  return NextResponse.redirect(url)
}
