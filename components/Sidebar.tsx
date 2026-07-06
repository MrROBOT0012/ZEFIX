'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, ClipboardList, FileText,
  CreditCard, Receipt, Wallet, BookOpen, FileSpreadsheet,
  Settings, LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/customers',   label: 'Customers',   icon: Users },
  { href: '/estimates',   label: 'Estimates',   icon: ClipboardList },
  { href: '/invoices',    label: 'Invoices',    icon: FileText },
  { href: '/payments',    label: 'Payments',    icon: CreditCard },
  { href: '/receipts',    label: 'Receipts',    icon: Receipt },
  { href: '/expenses',    label: 'Expenses',    icon: Wallet },
  { href: '/bookkeeping', label: 'Bookkeeping', icon: BookOpen },
  { href: '/excel',       label: 'Excel',       icon: FileSpreadsheet },
  { href: '/settings',    label: 'Settings',    icon: Settings },
]

export default function Sidebar({ companyName }: { companyName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 min-h-screen bg-slate-900 text-white">
      <div className="px-4 py-5 border-b border-slate-700/60">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Company</p>
        <p className="mt-1 text-sm font-semibold truncate">{companyName}</p>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={17} strokeWidth={1.75} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 py-3 border-t border-slate-700/60">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut size={17} strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
