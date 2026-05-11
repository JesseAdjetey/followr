import { NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { getOAuthClient } from '@/lib/gmail'
import { google } from 'googleapis'

const USER_ID = 'f4d5d408-5708-4e28-8873-c9690402792f'

export async function GET() {
  const supabase = createServiceSupabaseClient()

  const { data: settings, error } = await supabase
    .from('settings')
    .select('gmail_access_token, gmail_refresh_token, gmail_token_expiry')
    .eq('user_id', USER_ID)
    .single()

  if (error || !settings) {
    return NextResponse.json({ error: 'No settings row found', detail: error?.message })
  }

  const tokenInfo = {
    has_access_token: !!settings.gmail_access_token,
    access_token_preview: settings.gmail_access_token?.slice(0, 20) + '...',
    has_refresh_token: !!settings.gmail_refresh_token,
    refresh_token_preview: settings.gmail_refresh_token?.slice(0, 20) + '...',
    token_expiry: settings.gmail_token_expiry,
    expiry_is_future: settings.gmail_token_expiry ? new Date(settings.gmail_token_expiry) > new Date() : false,
  }

  // Try using the access token directly (no refresh)
  const auth = getOAuthClient()
  auth.setCredentials({
    access_token: settings.gmail_access_token,
    refresh_token: settings.gmail_refresh_token,
    expiry_date: settings.gmail_token_expiry ? new Date(settings.gmail_token_expiry).getTime() : undefined,
  })

  try {
    const gmail = google.gmail({ version: 'v1', auth })
    const res = await gmail.users.getProfile({ userId: 'me' })
    return NextResponse.json({
      tokenInfo,
      gmailProfile: { email: res.data.emailAddress, messagesTotal: res.data.messagesTotal },
      status: 'OK',
    })
  } catch (err: any) {
    return NextResponse.json({
      tokenInfo,
      status: 'FAILED',
      error: err?.message,
      errorCode: err?.code,
      googleError: err?.response?.data,
    })
  }
}
