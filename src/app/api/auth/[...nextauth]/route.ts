// Stub — auth is handled via Supabase Auth + custom Google OAuth flow in /api/auth/route.ts
import { NextResponse } from 'next/server'
export const GET = () => NextResponse.redirect('/')
export const POST = () => NextResponse.json({ error: 'Not implemented' }, { status: 404 })
