'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Ticket, ScanLine, Banknote } from 'lucide-react'
import { RAINBOW, type RgMe } from '@/lib/rangeela-client'

// Header, tab switcher and the liquid glass look shared by the three
// RANGEELA '26 admin pages.
export default function RangeelaTabs({ me, subtitle }: { me: RgMe | null; subtitle: string }) {
  const pathname = usePathname()
  const tabs = [
    { href: '/dashboard/rangeela', label: 'Tickets', icon: Ticket, show: true },
    { href: '/dashboard/rangeela/scan', label: 'Scan', icon: ScanLine, show: !!me?.can.scan },
    { href: '/dashboard/rangeela/cash', label: 'Cash desk', icon: Banknote, show: !!me?.can.cash },
  ].filter((t) => t.show)

  return (
    <>
      <RangeelaGlassStyles />
      <div className="rg-glass rg-head">
        <div className="rg-head-bar" style={{ background: RAINBOW }} />
        <div className="rg-head-row">
          <img src="/rangeela-logo.webp" alt="RANGEELA '26" className="rg-head-logo" />
          <div className="rg-head-text">
            <div className="rg-head-title">RANGEELA &apos;26</div>
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

/** Liquid glass backdrop + shared classes for the Rangeela admin pages. */
export function RangeelaGlassStyles() {
  return (
    <>
      <div className="rg-bg" aria-hidden>
        <span className="rg-blob a" /><span className="rg-blob b" /><span className="rg-blob c" /><span className="rg-blob d" />
      </div>
      <style>{`
        .rg-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; background: linear-gradient(180deg, #FBF6F3 0%, #F7F2FB 50%, #F1F4FF 100%); }
        .rg-blob { position: absolute; border-radius: 50%; filter: blur(70px); opacity: .42; }
        .rg-blob.a { width: 520px; height: 520px; left: -120px; top: -80px; background: #FF6FB5; }
        .rg-blob.b { width: 460px; height: 460px; right: -120px; top: 120px; background: #FFB54D; }
        .rg-blob.c { width: 480px; height: 480px; left: 30%; bottom: -160px; background: #7FD3FF; }
        .rg-blob.d { width: 380px; height: 380px; right: 10%; bottom: 10%; background: #B08BFF; opacity: .32; }
        .rg-page { position: relative; z-index: 1; }

        .rg-glass { position: relative; background: rgba(255,255,255,0.58); border: 1px solid rgba(255,255,255,0.8); -webkit-backdrop-filter: blur(22px) saturate(170%); backdrop-filter: blur(22px) saturate(170%);
          box-shadow: 0 10px 30px -14px rgba(60,20,80,0.22), inset 0 1px 0 rgba(255,255,255,0.95); border-radius: 22px; }
        .rg-glass-strong { background: rgba(255,255,255,0.8); }

        .rg-head { overflow: hidden; }
        .rg-head-bar { height: 4px; }
        .rg-head-row { display: flex; align-items: center; gap: 14px; padding: 14px 18px; }
        .rg-head-logo { width: 92px !important; height: auto !important; flex-shrink: 0; }
        .rg-head-text { flex: 1; min-width: 0; }
        .rg-head-title { font-size: 18px; font-weight: 800; color: #1B1320; letter-spacing: -0.01em; }
        .rg-head-sub { font-size: 12.5px; color: #6B5E68; margin-top: 2px; line-height: 1.4; }
        .rg-head-me { text-align: right; flex-shrink: 0; }
        .rg-head-me-name { font-size: 12.5px; font-weight: 700; color: #1B1320; }
        .rg-head-me-role { font-size: 10px; text-transform: uppercase; letter-spacing: .12em; color: #6B5E68; margin-top: 2px; }

        .rg-seg { display: flex; padding: 5px; gap: 4px; border-radius: 999px; }
        .rg-seg-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 42px; border-radius: 999px; font-size: 14px; font-weight: 700; color: #3A2E38; text-decoration: none; transition: background .2s, color .2s; white-space: nowrap; }
        .rg-seg-btn.is-on { background: #1B1320; color: #fff; box-shadow: 0 6px 16px -8px rgba(27,19,32,0.7); }

        .rg-label { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; color: #6B5E68; }
        .rg-input { width: 100%; height: 48px; padding: 0 14px; border-radius: 14px; border: 1px solid rgba(27,19,32,0.12); background: rgba(255,255,255,0.8); font-size: 16px; color: #1B1320; outline: none; }
        .rg-input:focus { border-color: #7B2FF7; box-shadow: 0 0 0 4px rgba(123,47,247,0.14); background: #fff; }
        .rg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 48px; padding: 0 18px; border-radius: 14px; font-size: 14px; font-weight: 700; border: none; cursor: pointer; transition: transform .12s, opacity .2s; }
        .rg-btn:active { transform: scale(.98); }
        .rg-btn:disabled { opacity: .5; cursor: default; }
        .rg-btn-dark { background: #1B1320; color: #fff; }
        .rg-btn-green { background: #16A34A; color: #fff; box-shadow: 0 8px 18px -10px rgba(22,163,74,0.9); }
        .rg-btn-ghost { background: rgba(255,255,255,0.75); color: #1B1320; border: 1px solid rgba(27,19,32,0.1); }
        .rg-btn-danger { background: rgba(255,255,255,0.75); color: #DC2626; border: 1px solid rgba(220,38,38,0.25); }
        .rg-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; border: 1px solid transparent; }
        .rg-chip.pending { background: #FFF4DB; color: #B45309; border-color: #FCD9A0; }
        .rg-chip.approved { background: #E6F8EC; color: #15803D; border-color: #BBE8CA; }
        .rg-chip.rejected { background: #FDECEC; color: #DC2626; border-color: #F8C4C4; }
        .rg-chip.in { background: #F1E9FF; color: #6D28D9; border-color: #DCCBFF; }
        .rg-chip.warn { background: #FFF1E6; color: #C2410C; border-color: #FFD2B3; }

        @media (max-width: 640px) {
          .rg-head-row { padding: 12px 14px; gap: 12px; }
          .rg-head-logo { width: 70px !important; }
          .rg-head-me { display: none; }
          .rg-head-title { font-size: 16px; }
        }
      `}</style>
    </>
  )
}
