/**
 * /api/auth/callback
 * Handles Supabase Auth OAuth callback.
 * Exchanges the code for a session, then saves Gmail tokens to settings.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Use the configured app URL so Vercel internal routing doesn't resolve to localhost
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin

  if (error || !code) {
    return NextResponse.redirect(`${base}/auth/signin?error=oauth_failed`)
  }

  const supabase = createServerSupabaseClient()

  // Exchange the code for a Supabase session
  const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

  if (sessionError || !data.session) {
    console.error('Session exchange error:', sessionError)
    return NextResponse.redirect(`${base}/auth/signin?error=session_failed`)
  }

  const user = data.session.user
  const providerToken = data.session.provider_token
  const providerRefreshToken = data.session.provider_refresh_token

  // Save Gmail tokens to settings table
  if (providerToken || providerRefreshToken) {
    await supabase.from('settings').upsert({
      user_id: user.id,
      gmail_access_token: providerToken ?? null,
      gmail_refresh_token: providerRefreshToken ?? null,
      gmail_token_expiry: null,
    }, { onConflict: 'user_id' })
  }

  return NextResponse.redirect(`${base}/`)
}
