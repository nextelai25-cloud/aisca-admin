'use client'
import React, { useState } from 'react'
import { lkr, fmtDateTime, STATUS_LABEL } from '@/lib/fin'
import type { DeskProps } from './FinanceDesk'
import { C, card, Btn, Badge, Stat, Input, FormError } from './ui'

const STEPS = [
  ['Budget', 'Event budget prepared first.'],
  ['Requisition', 'Team member fills it, Department Head signs.'],
  ['Approval', 'CFO approves. Above the limit, Chairperson too.'],
  ['Quotations', '2 to 3 vendor quotes compared.'],
  ['Payment voucher', 'CFO issues it for the approved amount.'],
  ['Paid & recorded', 'Bill attached, sealed, posted to the ledger.'],
]

export default function Overview({ d, act, go }: DeskProps) {
  const me = d.me.can
  const threshold = Number(d.settings.approval_threshold)
  const [t, setT] = useState(String(threshold))
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const queue: { key: string; label: string; sub: string; status: string; tab: 'requisitions' | 'vouchers' | 'reimbursements'; id: string }[] = []
  for (const r of d.requisitions) {
    if ((me.cfo && r.status === 'pending_cfo') || (me.second && r.status === 'pending_second' && r.cfo_by !== d.me.email))
      queue.push({ key: r.id, label: `${r.req_no} ${r.title}`, sub: `${r.event} / ${r.department} / ${lkr(r.estimated_amount)}`, status: r.status, tab: 'requisitions', id: r.id })
    const live = d.vouchers.find((v) => v.requisition_id === r.id && v.status !== 'void')
    if (me.pay && r.status === 'approved' && !live)
      queue.push({ key: r.id + 'pv', label: `${r.req_no} ${r.title}`, sub: `Approved. Issue the payment voucher (${lkr(r.estimated_amount)})`, status: 'approved', tab: 'requisitions', id: r.id })
  }
  for (const v of d.vouchers) if (me.pay && v.status === 'authorised')
    queue.push({ key: v.id, label: `${v.pv_no} ${v.payee}`, sub: `Pay and record ${lkr(v.actual_amount)}`, status: 'authorised', tab: 'vouchers', id: v.id })
  for (const r of d.reimbursements) {
    if ((me.cfo && r.status === 'pending_cfo') || (me.second && r.status === 'pending_second' && r.cfo_by !== d.me.email) || (me.pay && r.status === 'approved'))
      queue.push({ key: r.id, label: `${r.rb_no} ${r.claimant}`, sub: `${r.purpose} / ${lkr(r.claim_amount)}`, status: r.status, tab: 'reimbursements', id: r.id })
  }

  const petty = d.petty.reduce((s, p) => s + (p.entry_type === 'top_up' ? 1 : -1) * Number(p.amount), 0)
  const paidOut = d.vouchers.filter((v) => v.status === 'paid').reduce((s, v) => s + Number(v.actual_amount), 0)
    + d.reimbursements.filter((r) => r.status === 'paid').reduce((s, r) => s + Number(r.claim_amount), 0)
  const income = d.income.filter((i) => i.kind === 'monetary').reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <Stat label="Waiting for you" value={String(queue.length)} sub={`Signed in as ${d.me.name}`} />
        <Stat label="Income recorded" value={lkr(income)} sub="All events, money only" />
        <Stat label="Paid and recorded" value={lkr(paidOut)} sub="Vouchers and reimbursements" />
        <Stat label="Petty cash in hand" value={lkr(petty)} sub="Per the petty cash book" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 18 }} className="fin-two">
        <style>{`@media (max-width: 900px) { .fin-two { grid-template-columns: 1fr !important; } }`}</style>
        <div style={card}>
          <b style={{ fontSize: 15 }}>Your queue</b>
          <div style={{ marginTop: 10 }}>
            {queue.length === 0 && <p style={{ color: C.sub, fontSize: 13, padding: '18px 0' }}>Nothing is waiting for you.</p>}
            {queue.map((q) => (
              <div key={q.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${C.soft}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.label}</div>
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{q.sub}</div>
                </div>
                <Badge status={q.status} label={STATUS_LABEL[q.status] || q.status} />
                <Btn small kind="primary" onClick={() => go(q.tab, q.id)}>Open</Btn>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={card}>
            <b style={{ fontSize: 15 }}>Approval matrix</b>
            <div style={{ fontSize: 13, color: C.ink, marginTop: 10, lineHeight: 1.6 }}>
              Up to <b>{lkr(threshold)}</b>: CFO alone.<br />
              Above <b>{lkr(threshold)}</b>: CFO, then Chairperson.<br />
              <span style={{ color: C.sub, fontSize: 12 }}>The second approver must be a different person.</span>
            </div>
            {me.settings && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Input type="number" min={1000} step={1000} value={t} onChange={(e) => setT(e.target.value)} style={{ maxWidth: 160 }} />
                <Btn onClick={async () => { setErr(''); setMsg(''); const e = await act({ action: 'settings.update', approval_threshold: t }); if (e) setErr(e); else setMsg('Saved') }}>Save limit</Btn>
                {msg && <span style={{ fontSize: 12, color: C.green, alignSelf: 'center' }}>{msg}</span>}
              </div>
            )}
            <FormError text={err} />
          </div>
          <div style={card}>
            <b style={{ fontSize: 15 }}>How a payment moves</b>
            <ol style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 12.5, lineHeight: 1.65, color: C.ink }}>
              {STEPS.map(([a, b]) => <li key={a}><b>{a}.</b> <span style={{ color: C.sub }}>{b}</span></li>)}
            </ol>
          </div>
        </div>
      </div>

      <div style={card}>
        <b style={{ fontSize: 15 }}>Recent activity</b>
        <div style={{ marginTop: 8, maxHeight: 320, overflowY: 'auto' }}>
          {d.log.length === 0 && <p style={{ color: C.sub, fontSize: 13, padding: '12px 0' }}>No activity yet.</p>}
          {d.log.map((l) => (
            <div key={l.id} style={{ display: 'flex', gap: 12, fontSize: 12.5, padding: '8px 0', borderBottom: `1px solid ${C.soft}` }}>
              <span style={{ color: C.sub, width: 150, flexShrink: 0 }}>{fmtDateTime(l.at)}</span>
              <span style={{ flex: 1 }}><b>{l.doc_no || l.doc_type}</b> {l.action.replace(/_/g, ' ')}{l.note ? `: ${l.note}` : ''}</span>
              <span style={{ color: C.sub }}>{l.by_name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
