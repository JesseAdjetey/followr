import { isToday, isThisWeek, isPast } from 'date-fns'
import type { Thread, Step, ThreadWithUrgency, UrgencyGroup } from '@/types'

export function getThreadUrgency(thread: Thread & { steps?: Step[] }): UrgencyGroup {
  if (thread.status === 'replied') return 'replied'
  if (thread.status === 'completed') return 'completed'
  if (thread.status === 'overdue') return 'overdue'

  const nextStep = thread.steps
    ?.filter(s => s.status === 'pending' || s.status === 'due')
    .sort((a, b) => a.step_number - b.step_number)[0]

  if (!nextStep?.scheduled_at) return 'later'

  const date = new Date(nextStep.scheduled_at)
  if (isPast(date)) return 'overdue'
  if (isToday(date)) return 'today'
  if (isThisWeek(date, { weekStartsOn: 1 })) return 'this_week'
  return 'later'
}

export function enrichThread(thread: Thread & { steps?: Step[] }): ThreadWithUrgency {
  const urgency = getThreadUrgency(thread)
  const steps = thread.steps ?? []
  const nextStep = steps
    .filter(s => s.status === 'pending' || s.status === 'due')
    .sort((a, b) => a.step_number - b.step_number)[0]

  return {
    ...thread,
    urgency,
    next_step: nextStep,
    steps_sent: steps.filter(s => s.status === 'sent').length,
    steps_total: steps.length,
  }
}

export function getStatusLabel(thread: ThreadWithUrgency): string {
  if (thread.status === 'replied') return 'Replied'
  if (thread.status === 'completed') return 'Completed'
  if (thread.urgency === 'overdue') {
    if (!thread.next_step?.scheduled_at) return 'Overdue'
    const days = Math.floor((Date.now() - new Date(thread.next_step.scheduled_at).getTime()) / 86400000)
    return days === 0 ? 'Overdue today' : `${days} day${days !== 1 ? 's' : ''} overdue`
  }
  if (thread.urgency === 'today') return 'Due today'
  if (thread.next_step?.scheduled_at) {
    const days = Math.ceil((new Date(thread.next_step.scheduled_at).getTime() - Date.now()) / 86400000)
    return `In ${days} day${days !== 1 ? 's' : ''}`
  }
  return 'Scheduled'
}
