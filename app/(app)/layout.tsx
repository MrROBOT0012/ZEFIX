import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company } = await supabase
    .from('companies')
    .select('legal_name')
    .single()

  const companyName = company?.legal_name ?? 'Zelaya & Co. LLC'

  return (
    <div className="flex min-h-screen">
      <Sidebar companyName={companyName} />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  )
}
