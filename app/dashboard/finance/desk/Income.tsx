'use client'
import React, { useState } from 'react'
import { Plus, Printer } from 'lucide-react'
import { FIN_INCOME_SOURCES, lkr, fmtDate } from '@/lib/fin'
import { printIncome } from '@/lib/fin-print'
import type { DeskProps } from './FinanceDesk'
import { eventOptions } from './Requisitions'
import { C, card, th, td, tdNum, Btn, Modal, Field, Grid, Input, Textarea, Select, FileField, Empty, FormError } from './ui'

const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10)
const blank = { event: 'General', source_type: 'Sponsorship', received_from: '', kind: 'monetary', amount: '', payment_method: 'bank', reference: '', received_on: today(), in_kind_description: '', in_kind_value: '', proof_url: '', notes: '' }

export default function Income({ d, act }: DeskProps) {
  const [event, setEvent] = useState('All')
  const [form, setForm] = useState<typeof blank | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const events = eventOptions(d.income.map((i) => i.event))
  const rows = d.income.filter((i) => event === 'All' || i.event === event)
  const total = rows.filter((i) => i.kind === 'monetary').reduce((s, i) => s + Number(i.amount), 0)
  const inKind = rows.filter((i) => i.kind === 'in_kind').reduce((s, i) => s + Number(i.in_kind_value || 0), 0)

  async function save() {
    if (!form) return
    setBusy(true); setErr('')
    const e = await act({ action: 'ir.create', ...form })
    setBusy(false)
    if (e) setErr(e); else setForm(null)
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <b style={{ fontSize: 15, marginRight: 'auto' }}>Income receipts</b>
        <Select value={event} onChange={(e) => setEvent(e.target.value)} options={['All', ...events]} style={{ width: 170 }} />
        {d.me.can.pay && <Btn kind="primary" onClick={() => { setErr(''); setForm({ ...blank, event: event === 'All' ? 'General' : event }) }}><Plus size={14} /> New receipt</Btn>}
      </div>
      <p style={{ fontSize: 12.5, color: C.sub, marginTop: 0 }}>
        Kept per event: record only what was received for that event. Money is posted to the ledger; in-kind support is kept on file at its estimated value.
        {' '}Shown: <b style={{ color: C.ink }}>{lkr(total)}</b> money{inKind ? <>, <b style={{ color: C.ink }}>{lkr(inKind)}</b> in kind</> : null}.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Receipt</th><th style={th}>From</th><th style={th}>Event / source</th><th style={th}>Mode</th><th style={{ ...th, textAlign: 'right' }}>Amount</th><th style={th}></th></tr></thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <td style={td}><b>{i.ir_no}</b><div style={{ fontSize: 11, color: C.sub }}>{fmtDate(i.received_on)}</div></td>
                <td style={td}>{i.received_from}</td>
                <td style={td}>{i.event}<div style={{ fontSize: 11, color: C.sub }}>{i.source_type}</div></td>
                <td style={td}>{i.kind === 'in_kind' ? 'In kind' : i.payment_method === 'cash' ? 'Cash' : 'Bank'}{i.reference && <div style={{ fontSize: 11, color: C.sub }}>{i.reference}</div>}</td>
                <td style={tdNum}>{i.kind === 'in_kind' ? <span style={{ color: C.sub }}>{i.in_kind_value ? lkr(i.in_kind_value) : 'In kind'}</span> : lkr(i.amount)}</td>
                <td style={{ ...td, textAlign: 'right' }}><Btn small onClick={() => printIncome(i)}><Printer size={12} /> Receipt</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty text="No income recorded here." />}
      </div>

      {form && (
        <Modal title="New income receipt" onClose={() => setForm(null)} wide>
          <Grid>
            <Field label="Event / project"><Input list="fin-events-ir" value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} /></Field>
            <Field label="Source"><Select value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })} options={Object.keys(FIN_INCOME_SOURCES)} /></Field>
            <Field label="Received from *"><Input value={form.received_from} onChange={(e) => setForm({ ...form, received_from: e.target.value })} placeholder="Company or person" /></Field>
            <Field label="Type"><Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} options={[['monetary', 'Money'], ['in_kind', 'In kind (goods or services)']]} /></Field>
            {form.kind === 'monetary' ? <>
              <Field label="Amount (LKR) *"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
              <Field label="Received by"><Select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} options={[['bank', 'Bank transfer / cheque'], ['cash', 'Cash']]} /></Field>
              <Field label={form.payment_method === 'bank' ? 'Bank reference *' : 'Reference'}><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
            </> : <>
              <Field label="What was given *" span2><Textarea value={form.in_kind_description} onChange={(e) => setForm({ ...form, in_kind_description: e.target.value })} placeholder="e.g. 300 water bottles, venue for the day, printing of 500 flyers" /></Field>
              <Field label="Estimated value (LKR)"><Input type="number" value={form.in_kind_value} onChange={(e) => setForm({ ...form, in_kind_value: e.target.value })} /></Field>
            </>}
            <Field label="Date received"><Input type="date" value={form.received_on} onChange={(e) => setForm({ ...form, received_on: e.target.value })} /></Field>
            <FileField label="Proof (slip, letter, agreement)" value={form.proof_url} onChange={(u) => setForm({ ...form, proof_url: u })} />
            <Field label="Notes" span2><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </Grid>
          <datalist id="fin-events-ir">{events.map((e) => <option key={e} value={e} />)}</datalist>
          <FormError text={err} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn onClick={() => setForm(null)}>Cancel</Btn>
            <Btn kind="primary" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Record receipt'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
