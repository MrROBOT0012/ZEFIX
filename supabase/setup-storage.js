// One-time setup: creates the private "receipts" Storage bucket used for
// expense receipt photo/PDF uploads. Run once with:
//   node --env-file=.env.local supabase/setup-storage.js
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (never expose this key client-side).
// After running this, apply supabase/migrations/0002_receipts_storage.sql in the
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

  const { data: existing } = await supabase.storage.getBucket('receipts')
  if (existing) {
    console.log('Bucket "receipts" already exists — nothing to do.')
    return
  }

  const { error } = await supabase.storage.createBucket('receipts', {
    public: false,
    fileSizeLimit: '10MB',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'],
  })

  if (error) {
    console.error('Failed to create bucket:', error.message)
    process.exit(1)
  }

  console.log('Created private bucket "receipts". Now apply supabase/migrations/0002_receipts_storage.sql.')
}

main()
