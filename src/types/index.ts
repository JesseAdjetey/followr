// Followr — TypeScript Types

export type SendMode = 'auto_send' | 'requires_approval'

export type ThreadStatus =
  | 'pending_setup'
  | 'waiting'
  | 'needs_approval'
  | 'overdue'
  | 'replied'
  | 'completed'
  | 'snoozed'

export type StepStatus = 'pending' | 'due' | 'approved' | 'sent' | 'skipped'
export type MessageSource = 'template' | 'custom'

export interface Settings {
  id: string
  user_id: string
  watched_cc_address: string
  default_send_mode: SendMode
  notifications_enabled: boolean
  gmail_access_token: string | null
  gmail_refresh_token: string | null
  gmail_token_expiry: string | null
  gmail_watch_expiry: string | null
  gmail_history_id: string | null
}

export interface Template {
  id: string
  user_id: string
  name: string
  body: string
  variables: string[]
  created_at: string
  updated_at: string
}

export interface Thread {
  id: string
  user_id: string
  gmail_thread_id: string
  gmail_message_id: string
  subject: string
  recipient_name: string | null
  recipient_email: string
  sender_name: string | null
  sender_email: string
  email_snippet: string | null
  email_date: string
  send_mode: SendMode
  status: ThreadStatus
  snoozed_until: string | null
  replied_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  steps?: Step[]
}

export interface Step {
  id: string
  thread_id: string
  user_id: string
  step_number: number
  send_after_days: number
  scheduled_at: string | null
  message_source: MessageSource
  template_id: string | null
  custom_body: string | null
  resolved_body: string | null
  status: StepStatus
  sent_at: string | null
  gmail_message_id: string | null
  created_at: string
  updated_at: string
  template?: Template
}

export type UrgencyGroup = 'overdue' | 'today' | 'this_week' | 'later' | 'replied' | 'completed'

export interface ThreadWithUrgency extends Thread {
  urgency: UrgencyGroup
  next_step?: Step
  steps_sent: number
  steps_total: number
}

export interface StepDraft {
  step_number: number
  send_after_days: number
  time_unit: 'days' | 'weeks'
  message_source: MessageSource
  template_id: string | null
  custom_body: string
}

export interface SetupFormData {
  send_mode: SendMode
  steps: StepDraft[]
}

export interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  to: string
  cc: string
  date: string
  snippet: string
  body: string
}
