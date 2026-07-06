import { createClient } from '@/lib/supabase/server'

export async function getCompany() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .single()
  if (error || !data) throw new Error('Company record not found')
  return data
}

export async function getCompanyId(): Promise<string> {
  const company = await getCompany()
  return company.id
}
