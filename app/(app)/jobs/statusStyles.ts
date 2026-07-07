import type { JobStatus } from '@/types/database'

export const statusLabel: Record<JobStatus, string> = {
  active: 'Active',
  in_progress: 'In Progress',
  completed: 'Completed',
  on_hold: 'On Hold',
}

export const statusBadgeCls: Record<JobStatus, string> = {
  active: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  on_hold: 'bg-gray-100 text-gray-700',
}
