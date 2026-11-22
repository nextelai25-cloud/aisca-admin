'use client'
import React, { useState } from 'react'
import { Printer, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { FIN_EXPENSE_CATEGORIES, lkr, fmtDate } from '@/lib/fin'
import { printPettyBook } from '@/lib/fin-print'
import type { DeskProps } from './FinanceDesk'
import { eventOptions } from './Requisitions'
import { C, card, th, td, tdNum, Btn, Modal, Field, Grid, Input, Select, FileField, Empty, FormError, Stat } from './ui'

const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10)

export default function PettyCash({ d, act }: DeskProps) {
  const [form, setForm] = useState<null | { entry_type: 'top_up' | 'spend'; amount: string; purpose: string; event: string; category: string; bill_no: string; bill_url: string; entry_date: string }>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const events = eventOptions(d.petty.map((p) => p.event))

  const signed = d.petty.map((p) => (p.entry_type === 'top_up' ? 1 : -1) * Number(p.amount))
  const rows = d.petty.map((p, i) => ({ ...p, bal: signed.slice(0, i + 1).reduce((a, b) => a + b, 0) }))
  const bal = signed.reduce((a, b) => a + b, 0)
  const month = today().slice(0, 7)
  const spentMonth = d.petty.filter((p) => p.entry_type === 'spend' && p.entry_date.startsWith(month)).reduce((s, p) => s + Number(p.amount), 0)

  async function save() {
    if (!form) return
    setBusy(true); setErr('')
    const e = await act({ action: 'pc.create', ...form })
    setBusy(false)
    if (e) setErr(e); else setForm(null)
  }
  const start = (t: 'top_up' | 'spend') => { setErr(''); setForm({ entry_type: t, amount: '', purpose: t === 'top_up' ? 'Petty cash top up' : '', event: 'General', category: FIN_EXPENSE_CATEGORIES[0], bill_no: '', bill_url: '', entry_date: today() }) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <Stat label="Cash in hand (book balance)" value={lkr(bal)} sub="Count the box; it should match" />
        <Stat label="Spent this month" value={lkr(spentMonth)} />
        <Stat label="Entries" value={String(d.petty.length)} />
      </div>
      <div style={card}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <b style={{ fontSize: 15, marginRight: 'auto' }}>Petty cash book</b>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 150 }} title="From" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 150 }} title="To" />
          <Btn onClick={() => printPettyBook(d.petty, from || undefined, to || undefined)}><Printer size={14} /> Print book</Btn>
          {d.me.can.pay && <>
            <Btn onClick={() => start('top_up')}><ArrowDownLeft size={14} /> Top up</Btn>
            <Btn kind="primary" onClick={() => start('spend')}><ArrowUpRight size={14} /> Spend</Btn>
          </>}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Date</th><th style={th}>No.</th><th style={th}>Particulars</th><th style={th}>Bill</th><th style={{ ...th, textAlign: 'right' }}>In</th><th style={{ ...th, textAlign: 'right' }}>Out</th><th style={{ ...th, textAlign: 'right' }}>Balance</th></tr></thead>
            <tbody>
              {[...rows].reverse().map((p) => (
                <tr key={p.id}>
                  <td style={td}>{fmtDate(p.entry_date)}</td>
                  <td style={td}><b>{p.pc_no}</b></td>
                  <td style={td}>{p.purpose}<div style={{ fontSize: 11, color: C.sub }}>{p.event}{p.recorded_name ? ` / ${p.recorded_name}` : ''}</div></td>
                  <td style={td}>{p.bill_url ? <a href={p.bill_url} target="_blank" rel="noreferrer" style={{ color: C.blue }}>{p.bill_no || 'Bill'}</a> : p.bill_no}</td>
                  <td style={tdNum}>{p.entry_type === 'top_up' ? lkr(p.amount) : ''}</td>
                  <td style={tdNum}>{p.entry_type === 'spend' ? lkr(p.amount) : ''}</td>
                  <td style={{ ...tdNum, fontWeight: 600 }}>{lkr(p.bal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <Empty text="No petty cash entries yet. Start with a top up." />}
        </div>
      </div>

      {form && (
        <Modal title={form.entry_type === 'top_up' ? 'Petty cash top up' : 'Petty cash spend'} onClose={() => setForm(null)}>
          <Grid>
            <Field label="Amount (LKR) *"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Date"><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></Field>
            <Field label={form.entry_type === 'top_up' ? 'Source (e.g. withdrawn from bank) *' : 'What was bought *'} span2><Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></Field>
            {form.entry_type === 'spend' && <>
              <Field label="Event / project"><Input list="fin-events-pc" value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} /></Field>
              <Field label="Budget head"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={FIN_EXPENSE_CATEGORIES} /></Field>
              <Field label="Bill no. *"><Input value={form.bill_no} onChange={(e) => setForm({ ...form, bill_no: e.target.value })} /></Field>
              <FileField label="Bill" required value={form.bill_url} onChange={(u) => setForm({ ...form, bill_url: u })} />
            </>}
          </Grid>
          <datalist id="fin-events-pc">{events.map((e) => <option key={e} value={e} />)}</datalist>
          {form.entry_type === 'top_up' && <p style={{ fontSize: 12, color: C.sub }}>A top up moves money into the petty cash box. It is not an expense; each spend is.</p>}
          <FormError text={err} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn onClick={() => setForm(null)}>Cancel</Btn>
            <Btn kind="primary" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Record'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
