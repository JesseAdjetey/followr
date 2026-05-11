import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/gmail'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const base = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  if (!code) {
    return NextResponse.redirect(`${base}/settings?gmail=error`)
  }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${base}/auth/signin`)
  }

  const tokens = await exchangeCodeForTokens(code)

  await supabase.from('settings').upsert({
    user_id: user.id,
    gmail_access_token: tokens.access_token ?? null,
    gmail_refresh_token: tokens.refresh_token ?? null,
    gmail_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
  }, { onConflict: 'user_id' })

  return NextResponse.redirect(`${base}/settings?gmail=connected`)
}
