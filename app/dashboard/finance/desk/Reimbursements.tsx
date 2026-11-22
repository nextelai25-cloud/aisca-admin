'use client'
import React, { useState } from 'react'
import { Plus, Printer, Check, X as XIcon, Banknote } from 'lucide-react'
import { FIN_DEPARTMENTS, FIN_EXPENSE_CATEGORIES, lkr, fmtDate, needsSecond, STATUS_LABEL, type FinReimbursement } from '@/lib/fin'
import { printReimbursement } from '@/lib/fin-print'
import type { DeskProps } from './FinanceDesk'
import { eventOptions } from './Requisitions'
import { C, card, th, td, tdNum, Btn, Badge, Modal, Field, Grid, Input, Textarea, Select, FileField, Empty, FormError } from './ui'

const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10)
const blank = { event: 'General', department: FIN_DEPARTMENTS[0], category: FIN_EXPENSE_CATEGORIES[0], claimant: '', purpose: '', bill_no: '', bill_date: '', bill_amount: '', claim_amount: '', bill_url: '' }

export default function Reimbursements({ d, act, focus }: DeskProps) {
  const [status, setStatus] = useState('open')
  const [form, setForm] = useState<typeof blank | null>(null)
  const [openRb, setOpenRb] = useState<FinReimbursement | null>(() => d.reimbursements.find((x) => x.id === focus) || null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const threshold = Number(d.settings.approval_threshold)
  const events = eventOptions(d.reimbursements.map((r) => r.event))
  const fresh = openRb ? d.reimbursements.find((x) => x.id === openRb.id) || null : null

  const rows = d.reimbursements.filter((r) => status === 'all' || (status === 'open' ? ['pending_cfo', 'pending_second', 'approved'].includes(r.status) : r.status === status))
  const over = form && Number(form.claim_amount) > Number(form.bill_amount)

  const run = async (body: Record<string, unknown>, after?: () => void) => {
    setBusy(true); setErr('')
    const e = await act(body)
    setBusy(false)
    if (e) setErr(e); else after?.()
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <b style={{ fontSize: 15, marginRight: 'auto' }}>Expense reimbursements</b>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 170 }}
          options={[['open', 'Open'], ['pending_cfo', 'Waiting for CFO'], ['pending_second', 'Waiting for Chairperson'], ['approved', 'Approved, to pay'], ['paid', 'Paid & recorded'], ['rejected', 'Rejected'], ['all', 'All']]} />
        {d.me.can.create && <Btn kind="primary" onClick={() => { setErr(''); setForm({ ...blank }) }}><Plus size={14} /> New claim</Btn>}
      </div>
      <p style={{ fontSize: 12.5, color: C.sub, marginTop: 0 }}>For someone who paid from their own pocket. Original bill is mandatory, the claim cannot exceed the bill, and the CFO must approve.</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>No.</th><th style={th}>Claimant</th><th style={th}>Purpose</th><th style={th}>Bill</th><th style={{ ...th, textAlign: 'right' }}>Claim</th><th style={th}>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => { setErr(''); setOpenRb(r) }} style={{ cursor: 'pointer' }}>
                <td style={td}><b>{r.rb_no}</b><div style={{ fontSize: 11, color: C.sub }}>{fmtDate(r.created_at)}</div></td>
                <td style={td}>{r.claimant}<div style={{ fontSize: 11, color: C.sub }}>{r.event}</div></td>
                <td style={td}>{r.purpose}</td>
                <td style={td}>{r.bill_no}<div style={{ fontSize: 11, color: C.sub }}>{lkr(r.bill_amount)}</div></td>
                <td style={tdNum}>{lkr(r.claim_amount)}</td>
                <td style={td}><Badge status={r.status} label={STATUS_LABEL[r.status]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty text="No claims here." />}
      </div>

      {form && (
        <Modal title="New reimbursement claim" onClose={() => setForm(null)} wide>
          <Grid>
            <Field label="Claimant (who paid) *"><Input value={form.claimant} onChange={(e) => setForm({ ...form, claimant: e.target.value })} /></Field>
            <Field label="Event / project"><Input list="fin-events-rb" value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} /></Field>
            <Field label="Department"><Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} options={FIN_DEPARTMENTS} /></Field>
            <Field label="Budget head"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={FIN_EXPENSE_CATEGORIES} /></Field>
            <Field label="Purpose / item *" span2><Textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></Field>
            <Field label="Bill / receipt no. *"><Input value={form.bill_no} onChange={(e) => setForm({ ...form, bill_no: e.target.value })} /></Field>
            <Field label="Bill date"><Input type="date" value={form.bill_date} onChange={(e) => setForm({ ...form, bill_date: e.target.value })} /></Field>
            <Field label="Bill amount (LKR) *"><Input type="number" value={form.bill_amount} onChange={(e) => setForm({ ...form, bill_amount: e.target.value })} /></Field>
            <Field label="Amount claimed (LKR) *" hint={over ? 'Cannot be more than the bill' : undefined}><Input type="number" value={form.claim_amount} onChange={(e) => setForm({ ...form, claim_amount: e.target.value })} style={over ? { borderColor: C.red } : undefined} /></Field>
            <FileField label="Original bill" required value={form.bill_url} onChange={(u) => setForm({ ...form, bill_url: u })} />
          </Grid>
          <datalist id="fin-events-rb">{events.map((e) => <option key={e} value={e} />)}</datalist>
          <FormError text={err} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn onClick={() => setForm(null)}>Cancel</Btn>
            <Btn kind="primary" disabled={busy || !!over} onClick={() => run({ action: 'rb.create', ...form }, () => setForm(null))}>{busy ? 'Saving...' : 'Submit claim'}</Btn>
          </div>
        </Modal>
      )}

      {fresh && <RbDetail r={fresh} d={d} run={run} busy={busy} err={err} threshold={threshold} onClose={() => setOpenRb(null)} />}
    </div>
  )
}

function RbDetail({ r, d, run, busy, err, threshold, onClose }: {
  r: FinReimbursement; d: DeskProps['d']; run: (b: Record<string, unknown>, after?: () => void) => Promise<void>; busy: boolean; err: string; threshold: number; onClose: () => void
}) {
  const me = d.me.can
  const big = needsSecond(r.claim_amount, threshold)
  const [note, setNote] = useState('')
  const [p, setP] = useState({ payment_method: 'cash', payment_ref: '', paid_on: today() })
  const canCfo = me.cfo && r.status === 'pending_cfo' && !(big && d.me.role !== 'cfo')
  const canSecond = me.second && r.status === 'pending_second' && r.cfo_by !== d.me.email
  return (
    <Modal title={`${r.rb_no}  ${r.claimant}`} onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <Badge status={r.status} label={STATUS_LABEL[r.status]} />
        {big && <span style={{ fontSize: 12, color: C.amber, fontWeight: 600 }}>Needs CFO and Chairperson</span>}
        <span style={{ flex: 1 }} />
        <Btn small onClick={() => printReimbursement(r, threshold)}><Printer size={13} /> Print form</Btn>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.8 }}>
        <div><b>Purpose:</b> {r.purpose}</div>
        <div><b>Event:</b> {r.event} / {r.department}</div>
        <div><b>Bill:</b> {r.bill_no} {r.bill_date ? `(${fmtDate(r.bill_date)})` : ''}, {lkr(r.bill_amount)} <a href={r.bill_url} target="_blank" rel="noreferrer" style={{ color: C.blue, marginLeft: 6 }}>View bill</a></div>
        <div><b>Claim:</b> {lkr(r.claim_amount)}</div>
        {r.cfo_at && <div style={{ color: C.sub }}>CFO: {r.cfo_name}, {fmtDate(r.cfo_at)}</div>}
        {r.second_at && <div style={{ color: C.sub }}>Chairperson: {r.second_name}, {fmtDate(r.second_at)}</div>}
        {r.paid_at && <div style={{ color: C.sub }}>Paid by {r.payment_method?.replace('_', ' ')} on {fmtDate(r.paid_on)} ({r.paid_name})</div>}
        {r.reject_reason && <div style={{ color: C.red }}>Rejected: {r.reject_reason}</div>}
      </div>
      {(canCfo || canSecond) && (
        <div style={{ ...card, background: C.soft, border: 'none', marginTop: 14 }}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (required when rejecting)" />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn kind="ok" disabled={busy} onClick={() => run({ action: canCfo ? 'rb.cfo' : 'rb.second', id: r.id, decision: 'approve', note })}><Check size={14} /> Approve</Btn>
            <Btn kind="danger" disabled={busy} onClick={() => run({ action: canCfo ? 'rb.cfo' : 'rb.second', id: r.id, decision: 'reject', note })}><XIcon size={14} /> Reject</Btn>
          </div>
        </div>
      )}
      {me.pay && r.status === 'approved' && (
        <div style={{ ...card, marginTop: 14 }}>
          <b style={{ fontSize: 13 }}>Pay the claimant</b>
          <Grid>
            <Field label="Pay by"><Select value={p.payment_method} onChange={(e) => setP({ ...p, payment_method: e.target.value })} options={[['cash', 'Cash'], ['bank', 'Bank transfer'], ['petty_cash', 'Petty cash']]} /></Field>
            <Field label={p.payment_method === 'bank' ? 'Bank reference *' : 'Reference'}><Input value={p.payment_ref} onChange={(e) => setP({ ...p, payment_ref: e.target.value })} /></Field>
            <Field label="Paid on"><Input type="date" value={p.paid_on} onChange={(e) => setP({ ...p, paid_on: e.target.value })} /></Field>
          </Grid>
          <div style={{ marginTop: 10 }}><Btn kind="primary" disabled={busy} onClick={() => run({ action: 'rb.pay', id: r.id, ...p })}><Banknote size={14} /> Mark paid and record</Btn></div>
        </div>
      )}
      <FormError text={err} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}><Btn onClick={onClose}>Close</Btn></div>
    </Modal>
  )
}
