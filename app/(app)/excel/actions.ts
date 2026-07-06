'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { syncWorkbook } from '@/lib/excel'

export type SyncState = { error?: string; success?: boolean } | null

export async function syncNow(_prev: SyncState, _formData: FormData): Promise<SyncState> {
  const supabase = await createClient()
  const companyId = await getCompanyId()

  try {
    await syncWorkbook(supabase, companyId)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Sync failed.' }
  }

  revalidatePath('/excel')
  return { success: true }
}
