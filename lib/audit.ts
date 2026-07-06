import { createClient } from '@/lib/supabase/server'
import type { AuditAction, AuditEntityType, Json } from '@/types/database'

type Supabase = Awaited<ReturnType<typeof createClient>>

export async function logAudit(
  supabase: Supabase,
  entityType: AuditEntityType,
  entityId: string,
  action: AuditAction,
  changedFields: object | null = null
): Promise<void> {
  const { error } = await supabase.from('audit_log').insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    changed_fields: changedFields as unknown as Json | null,
    changed_by: null,
  })
  if (error) {
    console.error(`Audit log insert failed for ${entityType} ${entityId} (${action}):`, error.message)
  }
}

// Diffs `after` against `before`, keeping only keys present in `after` whose
// value actually changed — so an update's audit entry shows just what moved.
export function diffFields(
  before: object,
  after: object
): Record<string, { before: unknown; after: unknown }> | null {
  const b = before as Record<string, unknown>
  const a = after as Record<string, unknown>
  const diff: Record<string, { before: unknown; after: unknown }> = {}
  for (const key of Object.keys(a)) {
    if (b[key] !== a[key]) {
      diff[key] = { before: b[key], after: a[key] }
    }
  }
  return Object.keys(diff).length ? diff : null
}
