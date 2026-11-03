'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Ticket, ScanLine, Banknote } from 'lucide-react'
import { RangeelaGlassStyles } from '../rangeela/RangeelaTabs'
import { MM_GOLD, type MmMe } from '@/lib/memora-client'

// Header, tab switcher and the glass look shared by the three MEMORA '26
// admin pages. Reuses the RANGEELA glass classes with a night and gold tint.
export default function MemoraTabs({ me, subtitle }: { me: MmMe | null; subtitle: string }) {
  const pathname = usePathname()
  const tabs = [
    { href: '/dashboard/memora', label: 'Tickets', icon: Ticket, show: true },
    { href: '/dashboard/memora/scan', label: 'Scan', icon: ScanLine, show: !!me?.can.scan },
    { href: '/dashboard/memora/cash', label: 'Cash desk', icon: Banknote, show: !!me?.can.cash },
  ].filter((t) => t.show)

  return (
    <>
      <MemoraGlassStyles />
      <div className="rg-glass rg-head">
        <div className="rg-head-bar" style={{ background: MM_GOLD }} />
        <div className="rg-head-row">
          <img src="/memora-logo.webp" alt="MEMORA '26" className="rg-head-logo mm-head-logo" />
          <div className="rg-head-text">
            <div className="rg-head-title">MEMORA &apos;26</div>
            <div className="rg-head-sub">{subtitle}</div>
          </div>
          {me && (
            <div className="rg-head-me">
              <div className="rg-head-me-name">{me.name}</div>
              <div className="rg-head-me-role">{me.role.replace(/_/g, ' ')}</div>
            </div>
          )}
        </div>
      </div>
      {tabs.length > 1 && (
        <div className="rg-glass rg-seg" role="tablist">
          {tabs.map((t) => {
            const active = pathname === t.href
            const Icon = t.icon
            return (
              <Link key={t.href} href={t.href} role="tab" aria-selected={active} className={`rg-seg-btn ${active ? 'is-on' : ''}`}>
                <Icon size={16} /> <span>{t.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}

/** The RANGEELA glass classes, re-tinted for MEMORA (night blue and gold). */
export function MemoraGlassStyles() {
  return (
    <>
      <RangeelaGlassStyles />
      <style>{`
        .rg-bg { background: linear-gradient(180deg, #F6F4EE 0%, #EEF1FA 55%, #E9EDF8 100%); }
        .rg-blob.a { background: #F2C14E; opacity: .35; }
        .rg-blob.b { background: #5AA9E6; opacity: .32; }
        .rg-blob.c { background: #FFB066; opacity: .3; }
        .rg-blob.d { background: #2B3A7A; opacity: .18; }
        .rg-root-accent, .mm-accent { color: #A8741C; }
        .rg-input:focus { border-color: #C8902E; box-shadow: 0 0 0 4px rgba(200,144,46,0.18); }
        .rg-seg-btn.is-on, .rg-btn-dark { background: #0B1230; }
        .rg-chip.in { background: #EAF0FF; color: #1E3A8A; border-color: #C9D6FF; }
        .rg-head-logo.mm-head-logo { width: 132px !important; border-radius: 12px; }
        @media (max-width: 640px) { .rg-head-logo.mm-head-logo { width: 96px !important; } }
      `}</style>
    </>
  )
}
