// One-time setup: creates the private "workbooks" Storage bucket used for the
// synced Excel workbook (one object per company at "<companyId>/workbook.xlsx",
// backups at "<companyId>/backups/<timestamp>.xlsx"). Run once with:
//   node --env-file=.env.local supabase/setup-workbook-storage.js
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (never expose this key client-side).
// After running this, apply supabase/migrations/0003_workbook_storage.sql in the
// Supabase SQL Editor to grant authenticated users access to the bucket's objects.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

async function main() {
  const supabase = createClient(url, serviceRoleKey)

  const { data: existing } = await supabase.storage.getBucket('workbooks')
  if (existing) {
    console.log('Bucket "workbooks" already exists — nothing to do.')
    return
  }

  const { error } = await supabase.storage.createBucket('workbooks', {
    public: false,
    fileSizeLimit: '25MB',
    allowedMimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  })

  if (error) {
    console.error('Failed to create bucket:', error.message)
    process.exit(1)
  }

  console.log('Created private bucket "workbooks". Now apply supabase/migrations/0003_workbook_storage.sql.')
}

main()
