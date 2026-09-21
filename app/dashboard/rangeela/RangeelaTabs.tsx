'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Ticket, ScanLine, Banknote } from 'lucide-react'
import { RAINBOW, type RgMe } from '@/lib/rangeela-client'

// Header + tab switcher shared by the three RANGEELA '26 admin pages.
export default function RangeelaTabs({ me, subtitle }: { me: RgMe | null; subtitle: string }) {
  const pathname = usePathname()
  const tabs = [
    { href: '/dashboard/rangeela', label: 'Tickets', icon: Ticket, show: true },
    { href: '/dashboard/rangeela/scan', label: 'Scan at gate', icon: ScanLine, show: !!me?.can.scan },
    { href: '/dashboard/rangeela/cash', label: 'Cash desk', icon: Banknote, show: !!me?.can.cash },
  ].filter((t) => t.show)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden bg-white border border-[#E8E8E8]">
        <div style={{ height: 5, background: RAINBOW }} />
        <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <img src="/rangeela-logo.webp" alt="RANGEELA '26" className="h-14 w-auto self-start" />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#111]">RANGEELA &apos;26</h1>
            <p className="text-xs text-[#6B6B6B] mt-0.5">{subtitle}</p>
          </div>
          {me && (
            <div className="text-[11px] text-[#6B6B6B] sm:text-right">
              Signed in as <span className="font-semibold text-[#111]">{me.name}</span>
              <div className="uppercase tracking-wider text-[10px] mt-0.5">{me.role.replace(/_/g, ' ')}</div>
            </div>
          )}
        </div>
      </div>
      {tabs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((t) => {
            const active = pathname === t.href
            const Icon = t.icon
            return (
              <Link key={t.href} href={t.href}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap border transition-all ${
                  active ? 'bg-[#111] text-white border-[#111]' : 'bg-white text-[#111] border-[#E8E8E8] hover:bg-[#F5F5F5]'
                }`}>
                <Icon size={15} /> {t.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
