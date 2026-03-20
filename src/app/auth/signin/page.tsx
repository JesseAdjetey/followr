'use client'

import { createBrowserSupabaseClient } from '@/lib/supabase'

export default function SignInPage() {
  async function handleGoogleSignIn() {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        scopes: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.modify',
        ].join(' '),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div
        className="bg-white rounded-2xl p-10 flex flex-col items-center gap-6 shadow-sm"
        style={{ border: '1px solid rgba(0,0,0,0.08)', maxWidth: 400, width: '100%' }}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>Followr</span>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>Automated email follow-ups</span>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-xl font-medium text-sm transition-opacity hover:opacity-85"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-xs text-center" style={{ color: 'var(--hint)' }}>
          We'll request Gmail access to detect CC'd emails<br />and send follow-ups on your behalf.
        </p>
      </div>
    </div>
  )
}
