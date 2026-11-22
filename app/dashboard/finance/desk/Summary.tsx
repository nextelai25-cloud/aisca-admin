'use client'
import React, { useMemo, useState } from 'react'
import { Printer, FileText } from 'lucide-react'
import { lkr, fmtDate } from '@/lib/fin'
import { eventTotals, printEventSummary, printFinalStatement } from '@/lib/fin-print'
import type { DeskProps } from './FinanceDesk'
import { eventOptions } from './Requisitions'
import { C, card, th, td, tdNum, Btn, Select, Stat, Empty } from './ui'

export default function Summary({ d }: DeskProps) {
  const events = useMemo(() => eventOptions([
    ...d.requisitions.map((r) => r.event), ...d.income.map((i) => i.event), ...d.reimbursements.map((r) => r.event), ...d.petty.map((p) => p.event),
  ]), [d])
  const [event, setEvent] = useState(events.includes('COMMERCE 360') ? 'COMMERCE 360' : events[0])
  const t = useMemo(() => eventTotals(d, event), [d, event])
  const net = t.income - t.expenses

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Select value={event} onChange={(e) => setEvent(e.target.value)} options={events} style={{ width: 220 }} />
        <span style={{ flex: 1 }} />
        <Btn onClick={() => printEventSummary(d, event)}><Printer size={14} /> Print event summary</Btn>
        <Btn kind="primary" onClick={() => printFinalStatement(d, events)}><FileText size={14} /> Final statement (all events)</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Stat label="Income" value={lkr(t.income)} sub="This event only" />
        <Stat label="Budget (approved requisitions)" value={lkr(t.budget)} />
        <Stat label="Spent (recorded)" value={lkr(t.expenses)} />
        <Stat label={net >= 0 ? 'Surplus' : 'Deficit'} value={lkr(Math.abs(net))} sub={t.inKind ? `Plus ${lkr(t.inKind)} in kind` : undefined} />
      </div>
      <div style={card}>
        <b style={{ fontSize: 15 }}>Budget against actual</b>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
          <thead><tr><th style={th}>Budget head</th><th style={{ ...th, textAlign: 'right' }}>Budget</th><th style={{ ...th, textAlign: 'right' }}>Actual</th><th style={{ ...th, textAlign: 'right' }}>Variance</th></tr></thead>
          <tbody>
            {Object.entries(t.expByCat).map(([k, v]) => (
              <tr key={k}><td style={td}>{k}</td><td style={tdNum}>{lkr(v.budget)}</td><td style={tdNum}>{lkr(v.actual)}</td>
                <td style={{ ...tdNum, color: v.budget - v.actual < 0 ? C.red : C.ink }}>{lkr(v.budget - v.actual)}</td></tr>
            ))}
          </tbody>
        </table>
        {Object.keys(t.expByCat).length === 0 && <Empty text="No budget or spending recorded for this event yet." />}
      </div>
      <div style={card}>
        <b style={{ fontSize: 15 }}>Documents in this event file</b>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
          <thead><tr><th style={th}>Date</th><th style={th}>No.</th><th style={th}>Type</th><th style={th}>Party</th><th style={{ ...th, textAlign: 'right' }}>Amount</th></tr></thead>
          <tbody>
            {t.docs.map((x) => (
              <tr key={x.no}><td style={td}>{fmtDate(x.date)}</td><td style={td}><b>{x.no}</b></td><td style={td}>{x.type}</td><td style={td}>{x.party}</td><td style={tdNum}>{lkr(x.amount)}</td></tr>
            ))}
          </tbody>
        </table>
        {t.docs.length === 0 && <Empty text="No recorded documents yet." />}
      </div>
    </div>
  )
}
