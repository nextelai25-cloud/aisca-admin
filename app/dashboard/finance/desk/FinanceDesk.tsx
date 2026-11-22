'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Inbox, FileSignature, Receipt, Wallet, HandCoins, Coins, PieChart, RefreshCw } from 'lucide-react'
import { finApi } from '@/lib/fin-client'
import type { FinData } from '@/lib/fin'
import { C, Btn } from './ui'
import Overview from './Overview'
import Requisitions from './Requisitions'
import Vouchers from './Vouchers'
import Reimbursements from './Reimbursements'
import Income from './Income'
import PettyCash from './PettyCash'
import Summary from './Summary'

export type Act = (body: Record<string, unknown>) => Promise<string | null>
export interface DeskProps { d: FinData; act: Act; go: (tab: Tab, focus?: string) => void; focus?: string }
export type Tab = 'overview' | 'requisitions' | 'vouchers' | 'reimbursements' | 'income' | 'petty' | 'summary'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'My queue', icon: Inbox },
  { id: 'requisitions', label: 'Requisitions', icon: FileSignature },
  { id: 'vouchers', label: 'Payment vouchers', icon: Receipt },
  { id: 'reimbursements', label: 'Reimbursements', icon: HandCoins },
  { id: 'income', label: 'Income receipts', icon: Wallet },
  { id: 'petty', label: 'Petty cash', icon: Coins },
  { id: 'summary', label: 'Event summaries', icon: PieChart },
]

export default function FinanceDesk() {
  const [d, setD] = useState<FinData | null>(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<Tab>('overview')
  const [focus, setFocus] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    const r = await finApi<FinData>()
    setBusy(false)
    if (r.ok) { setD(r.data); setErr('') } else setErr(r.data.error || 'Could not load the Finance Desk.')
  }, [])
  useEffect(() => {
    let live = true
    finApi<FinData>().then((r) => {
      if (!live) return
      if (r.ok) setD(r.data); else setErr(r.data.error || 'Could not load the Finance Desk.')
    })
    return () => { live = false }
  }, [])

  const act: Act = useCallback(async (body) => {
    const r = await finApi(body)
    if (!r.ok) return r.data.error || 'Something went wrong.'
    await load()
    return null
  }, [load])

  const go = (t: Tab, f?: string) => { setTab(t); setFocus(f) }

  const counts = useMemo(() => {
    if (!d) return {} as Record<Tab, number>
    const me = d.me.can
    const reqWait = d.requisitions.filter((r) => (me.cfo && r.status === 'pending_cfo') || (me.second && r.status === 'pending_second' && r.cfo_by !== d.me.email)).length
    const rbWait = d.reimbursements.filter((r) => (me.cfo && r.status === 'pending_cfo') || (me.second && r.status === 'pending_second' && r.cfo_by !== d.me.email) || (me.pay && r.status === 'approved')).length
    const pvWait = me.pay ? d.vouchers.filter((v) => v.status === 'authorised').length : 0
    return { overview: 0, requisitions: reqWait, vouchers: pvWait, reimbursements: rbWait, income: 0, petty: 0, summary: 0 } as Record<Tab, number>
  }, [d])

  if (err && !d) {
    return (
      <div style={{ background: '#FFFFFF', border: `1px solid ${C.line}`, borderRadius: 16, padding: 24 }}>
        <b>Finance Desk</b>
        <p style={{ color: C.red, fontSize: 13, marginTop: 8 }}>{err}</p>
        <div style={{ marginTop: 12 }}><Btn onClick={load}>Try again</Btn></div>
      </div>
    )
  }
  if (!d) return <p style={{ color: C.sub, fontSize: 13 }}>Loading Finance Desk...</p>

  const props: DeskProps = { d, act, go, focus }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {TABS.map((t) => {
          const Icon = t.icon, on = tab === t.id, n = counts[t.id]
          return (
            <button key={t.id} onClick={() => go(t.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', minHeight: 0,
                background: on ? C.ink : '#FFFFFF', color: on ? '#FFFFFF' : C.ink, border: `1px solid ${on ? C.ink : C.line}` }}>
              <Icon size={14} />{t.label}
              {n ? <span style={{ background: on ? '#FFFFFF' : C.red, color: on ? C.ink : '#FFFFFF', borderRadius: 999, fontSize: 10.5, padding: '1px 6px' }}>{n}</span> : null}
            </button>
          )
        })}
        <span style={{ flex: 1 }} />
        <Btn small onClick={load} disabled={busy}><RefreshCw size={13} /> Refresh</Btn>
      </div>
      {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
      {tab === 'overview' && <Overview {...props} />}
      {tab === 'requisitions' && <Requisitions {...props} />}
      {tab === 'vouchers' && <Vouchers {...props} />}
      {tab === 'reimbursements' && <Reimbursements {...props} />}
      {tab === 'income' && <Income {...props} />}
      {tab === 'petty' && <PettyCash {...props} />}
      {tab === 'summary' && <Summary {...props} />}
    </div>
  )
}
