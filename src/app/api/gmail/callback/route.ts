import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, gmailAddressFor } from '@/lib/gmail'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const base = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  console.log('Gmail callback hit - code:', !!code, 'error:', error)

  if (error || !code) {
    console.error('Gmail OAuth error:', error)
    return NextResponse.redirect(`${base}/settings?gmail=error`)
  }

  const supabase = createServerSupabaseClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  console.log('Gmail callback user:', user?.id, 'userError:', userError?.message)

  if (!user) {
    return NextResponse.redirect(`${base}/auth/signin`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    console.log('Tokens received - access:', !!tokens.access_token, 'refresh:', !!tokens.refresh_token)

    const serviceClient = createServiceSupabaseClient()
    const { error: upsertError } = await serviceClient.from('settings').upsert({
      user_id: user.id,
      gmail_access_token: tokens.access_token ?? null,
      gmail_refresh_token: tokens.refresh_token ?? null,
      gmail_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    }, { onConflict: 'user_id' })

    if (upsertError) console.error('Settings upsert error:', upsertError.message)
    else console.log('Gmail tokens saved for user:', user.id)

    // Which mailbox these tokens belong to. Recorded now because outbound is
    // told who should send and has to find the matching account — the tokens
    // alone do not say. Best effort: failing to read it must not cost the
    // connection that has just succeeded, and the poll backfills it later.
    const address = await gmailAddressFor(user.id)
    if (address) {
      await serviceClient
        .from('settings')
        .update({ gmail_address: address })
        .eq('user_id', user.id)
    }
  } catch (err) {
    console.error('Token exchange error:', err)
    return NextResponse.redirect(`${base}/settings?gmail=error`)
  }

  return NextResponse.redirect(`${base}/settings?gmail=connected`)
}
