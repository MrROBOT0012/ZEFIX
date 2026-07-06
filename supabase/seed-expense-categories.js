// One-time setup: seeds the default expense_categories for Zelaya & Co. LLC
// (the migration's INSERT is commented out since it depends on the company_id
// that only exists once the companies row is created). Idempotent — safe to
// re-run; relies on the (company_id, name) unique constraint.
//   node --env-file=.env.local supabase/seed-expense-categories.js

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const DEFAULT_CATEGORIES = [
  'Materials & Supplies',
  'Equipment & Tools',
  'Subcontractors',
  'Transportation & Vehicle',
  'Insurance',
  'Licenses & Permits',
  'Marketing & Advertising',
  'Office & Administrative',
  'Utilities',
  'Meals & Entertainment',
  'Professional Services',
  'Other',
]

async function main() {
  const supabase = createClient(url, serviceRoleKey)

  const { data: company, error: companyErr } = await supabase.from('companies').select('id').single()
  if (companyErr || !company) {
    console.error('Could not find a companies row:', companyErr?.message)
    process.exit(1)
  }

  const rows = DEFAULT_CATEGORIES.map((name) => ({ company_id: company.id, name, is_default: true }))

  const { data, error } = await supabase
    .from('expense_categories')
    .upsert(rows, { onConflict: 'company_id,name', ignoreDuplicates: true })
    .select('name')

  if (error) {
    console.error('Failed to seed categories:', error.message)
    process.exit(1)
  }

  console.log(`Seeded ${data.length} expense categories (already-existing ones were skipped).`)
}

main()
