/**
 * Sequence scheduling logic.
 * Computes scheduled_at dates for each step when a thread is activated.
 */

import { StepDraft } from '@/types'

/**
 * Given the thread creation date and an array of step drafts,
 * compute the scheduled_at timestamp for each step.
 *
 * Step 1: threadDate + step1.send_after_days
 * Step 2: step1.scheduled_at + step2.send_after_days
 * etc.
 */
export function computeScheduledDates(
  threadDate: Date,
  steps: StepDraft[]
): Date[] {
  const dates: Date[] = []
  let prev = threadDate

  for (const step of steps) {
    const days =
      step.time_unit === 'weeks'
        ? step.send_after_days * 7
        : step.send_after_days

    const next = new Date(prev)
    next.setDate(next.getDate() + days)
    dates.push(next)
    prev = next
  }

  return dates
}

/**
 * Determine if a thread is overdue based on its steps.
 * A thread is overdue if it requires approval AND
 * the current due step's scheduled_at is in the past.
 */
export function isThreadOverdue(
  sendMode: string,
  steps: Array<{ status: string; scheduled_at: string | null }>
): boolean {
  if (sendMode !== 'requires_approval') return false
  const dueStep = steps.find(s => s.status === 'due' || s.status === 'pending')
  if (!dueStep?.scheduled_at) return false
  return new Date(dueStep.scheduled_at) < new Date()
}
