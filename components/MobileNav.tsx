'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, FileText, ClipboardList, Wallet, MoreHorizontal,
  Users, Briefcase, CreditCard, Receipt, BookOpen, FileSpreadsheet, Settings,
  LogOut, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const mainItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/invoices',  label: 'Invoices',  icon: FileText },
  { href: '/estimates', label: 'Estimates', icon: ClipboardList },
  { href: '/expenses',  label: 'Expenses',  icon: Wallet },
]

const moreItems = [
  { href: '/customers',   label: 'Customers',   icon: Users },
  { href: '/jobs',        label: 'Jobs',        icon: Briefcase },
  { href: '/payments',    label: 'Payments',    icon: CreditCard },
  { href: '/receipts',    label: 'Receipts',    icon: Receipt },
  { href: '/bookkeeping', label: 'Bookkeeping', icon: BookOpen },
  { href: '/excel',       label: 'Excel',       icon: FileSpreadsheet },
  { href: '/settings',    label: 'Settings',    icon: Settings },
]

export default function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/login')
    router.refresh()
  }

  const moreActive = moreItems.some(
    ({ href }) => pathname === href || pathname.startsWith(href + '/')
  )

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {open && (
        <div className="fixed bottom-16 inset-x-0 bg-white rounded-t-2xl shadow-2xl z-50 md:hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <span className="text-sm font-semibold text-gray-700">More</span>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1 px-3 pb-2">
            {moreItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Icon size={22} className="text-gray-600" strokeWidth={1.75} />
                <span className="text-xs text-gray-600">{label}</span>
              </Link>
            ))}
          </div>
          <div className="px-3 pb-4 border-t border-gray-100 pt-2">
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-100 text-sm text-gray-600 transition-colors"
            >
              <LogOut size={18} strokeWidth={1.75} />
              Sign out
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 h-16 bg-white border-t border-gray-200 flex items-stretch z-30 md:hidden">
        {mainItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <Icon size={22} strokeWidth={1.75} />
              {label}
            </Link>
          )
        })}
        <button
          onClick={() => setOpen(!open)}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
            open || moreActive ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <MoreHorizontal size={22} strokeWidth={1.75} />
          More
        </button>
      </nav>
    </>
  )
}
