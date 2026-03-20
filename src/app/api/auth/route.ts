// Auth is now initiated client-side via supabase.auth.signInWithOAuth()
// This route is no longer used.
import { NextResponse } from 'next/server'
export const GET = () => NextResponse.redirect('/')
