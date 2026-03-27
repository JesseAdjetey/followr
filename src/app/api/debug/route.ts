import { NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServiceSupabaseClient()

  const { data, error } = await supabase
    .from('settings')
    .select('user_id, auto_followup_enabled, auto_followup_steps')
    .eq('user_id', 'f4d5d408-5708-4e28-8873-c9690402792f')
    .single()

  return NextResponse.json({ data, error: error?.message ?? null })
}
