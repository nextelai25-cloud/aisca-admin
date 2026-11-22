'use client'
import React, { useMemo, useState } from 'react'
import { Plus, Printer, Check, X as XIcon, Trash2, Star } from 'lucide-react'
import {
  FIN_EVENTS, FIN_DEPARTMENTS, FIN_EXPENSE_CATEGORIES, lkr, fmtDate, fmtDateTime, needsSecond, STATUS_LABEL,
  type FinRequisition, FIN_DEFAULT_EVENT } from '@/lib/fin'
import { printRequisition, printComparison } from '@/lib/fin-print'
import type { DeskProps } from './FinanceDesk'
import { C, card, th, td, tdNum, Btn, Badge, Modal, Field, Grid, Input, Textarea, Select, FileField, Empty, FormError, EventSelect } from './ui'

const blank = {
  event: FIN_DEFAULT_EVENT, department: FIN_DEPARTMENTS[0], category: FIN_EXPENSE_CATEGORIES[0], title: '', details: '', quantity: '',
  budgeted_amount: '', estimated_amount: '', needed_by: '', requested_by: '', head_name: '', head_signed_on: '', form_url: '',
}

export const eventOptions = (extra: string[]) => Array.from(new Set([...FIN_EVENTS, ...extra.filter(Boolean)]))

export default function Requisitions({ d, act, focus }: DeskProps) {
  const [status, setStatus] = useState('open')
  const [event, setEvent] = useState('All')
  const [q, setQ] = useState('')
  const [form, setForm] = useState<typeof blank | null>(null)
  const [openId, setOpenId] = useState<string | null>(focus || null)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const threshold = Number(d.settings.approval_threshold)
  const events = eventOptions(d.requisitions.map((r) => r.event))
  const rows = useMemo(() => d.requisitions.filter((r) =>
    (status === 'all' || (status === 'open' ? ['pending_cfo', 'pending_second', 'approved'].includes(r.status) : r.status === status)) &&
    (event === 'All' || r.event === event) &&
    (!q || `${r.req_no} ${r.title} ${r.department} ${r.requested_by}`.toLowerCase().includes(q.toLowerCase()))
  ), [d.requisitions, status, event, q])
  const open = d.requisitions.find((r) => r.id === openId) || null

  async function create() {
    if (!form) return
    setSaving(true); setErr('')
    const e = await act({ action: 'req.create', ...form })
    setSaving(false)
    if (e) setErr(e); else setForm(null)
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <b style={{ fontSize: 15, marginRight: 'auto' }}>Expense requisitions</b>
        <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 180 }} />
        <Select value={event} onChange={(e) => setEvent(e.target.value)} options={['All', ...events]} style={{ width: 160 }} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 170 }}
          options={[['open', 'Open'], ['pending_cfo', 'Waiting for CFO'], ['pending_second', 'Waiting for Chairperson'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['cancelled', 'Cancelled'], ['all', 'All']]} />
        {d.me.can.create && <Btn kind="primary" onClick={() => { setErr(''); setForm({ ...blank }) }}><Plus size={14} /> New requisition</Btn>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>No.</th><th style={th}>Requirement</th><th style={th}>Event / dept</th><th style={{ ...th, textAlign: 'right' }}>Estimate</th><th style={th}>Quotes</th><th style={th}>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const pv = d.vouchers.find((v) => v.requisition_id === r.id && v.status !== 'void')
              return (
                <tr key={r.id} onClick={() => { setErr(''); setOpenId(r.id) }} style={{ cursor: 'pointer' }}>
                  <td style={td}><b>{r.req_no}</b><div style={{ fontSize: 11, color: C.sub }}>{fmtDate(r.created_at)}</div></td>
                  <td style={td}>{r.title}<div style={{ fontSize: 11, color: C.sub }}>{r.category} / by {r.requested_by}</div></td>
                  <td style={td}>{r.event}<div style={{ fontSize: 11, color: C.sub }}>{r.department}</div></td>
                  <td style={tdNum}>{lkr(r.estimated_amount)}{needsSecond(r.estimated_amount, threshold) && <div style={{ fontSize: 10.5, color: C.amber }}>2 approvals</div>}</td>
                  <td style={td}>{r.quotations?.length || 0}</td>
                  <td style={td}><Badge status={pv ? pv.status : r.status} label={pv ? `${pv.pv_no} ${STATUS_LABEL[pv.status]}` : STATUS_LABEL[r.status]} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && <Empty text="No requisitions here." />}
      </div>

      {form && (
        <Modal title="New expense requisition" onClose={() => setForm(null)} wide>
          <p style={{ fontSize: 12.5, color: C.sub, marginTop: 0 }}>Enter the department&apos;s requisition form. It goes to the CFO only after the Department Head has signed it.</p>
          <Grid>
            <Field label="Event / project *"><EventSelect value={form.event} onChange={(v) => setForm({ ...form, event: v })} options={events} /></Field>
            <Field label="Department"><Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} options={FIN_DEPARTMENTS} /></Field>
            <Field label="Budget head (category)"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={FIN_EXPENSE_CATEGORIES} /></Field>
            <Field label="Requirement *" span2><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Event photography and videography" /></Field>
            <Field label="Details and expected deliverables" span2><Textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="What exactly is expected, e.g. 2 photographers, 300 edited photos, 1 min highlight reel within 5 days" /></Field>
            <Field label="Quantity"><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
            <Field label="Budgeted amount (LKR)" hint="From the approved budget proposal"><Input type="number" value={form.budgeted_amount} onChange={(e) => setForm({ ...form, budgeted_amount: e.target.value })} /></Field>
            <Field label="Estimated cost (LKR) *" hint={Number(form.estimated_amount) > threshold ? 'Above the limit: CFO and Chairperson must approve' : undefined}><Input type="number" value={form.estimated_amount} onChange={(e) => setForm({ ...form, estimated_amount: e.target.value })} /></Field>
            <Field label="Needed by"><Input type="date" value={form.needed_by} onChange={(e) => setForm({ ...form, needed_by: e.target.value })} /></Field>
            <Field label="Requested by (team member) *"><Input value={form.requested_by} onChange={(e) => setForm({ ...form, requested_by: e.target.value })} /></Field>
            <Field label="Department Head who signed *"><Input value={form.head_name} onChange={(e) => setForm({ ...form, head_name: e.target.value })} /></Field>
            <Field label="Head signed on"><Input type="date" value={form.head_signed_on} onChange={(e) => setForm({ ...form, head_signed_on: e.target.value })} /></Field>
            <FileField label="Signed form scan" value={form.form_url} onChange={(u) => setForm({ ...form, form_url: u })} hint="Photo or PDF of the signed paper form" />
          </Grid>
          <FormError text={err} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn onClick={() => setForm(null)}>Cancel</Btn>
            <Btn kind="primary" onClick={create} disabled={saving}>{saving ? 'Saving...' : 'Submit to CFO'}</Btn>
          </div>
        </Modal>
      )}

      {open && <Detail r={open} {...{ d, act }} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function Detail({ r, d, act, onClose }: { r: FinRequisition; d: DeskProps['d']; act: DeskProps['act']; onClose: () => void }) {
  const me = d.me.can
  const threshold = Number(d.settings.approval_threshold)
  const big = needsSecond(r.estimated_amount, threshold)
  const pv = d.vouchers.find((v) => v.requisition_id === r.id && v.status !== 'void')
  const quotes = r.quotations || []
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [qf, setQf] = useState<{ vendor: string; amount: string; contact: string; notes: string; file_url: string } | null>(null)
  const sel = quotes.find((x) => x.selected)
  const [pf, setPf] = useState<{ payee: string; actual_amount: string; payment_method: string; description: string; quotation_id: string } | null>(null)

  const run = async (body: Record<string, unknown>, after?: () => void) => {
    setBusy(true); setErr('')
    const e = await act(body)
    setBusy(false)
    if (e) setErr(e); else after?.()
  }
  const canCfo = me.cfo && r.status === 'pending_cfo' && !(big && d.me.role !== 'cfo')
  const canSecond = me.second && r.status === 'pending_second' && r.cfo_by !== d.me.email
  const quotesLocked = !!pv

  return (
    <Modal title={`${r.req_no}  ${r.title}`} onClose={onClose} wide>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <Badge status={r.status} label={STATUS_LABEL[r.status]} />
        {big && <span style={{ fontSize: 12, color: C.amber, fontWeight: 600 }}>Above {lkr(threshold)}: needs CFO and Chairperson</span>}
        <span style={{ flex: 1 }} />
        <Btn small onClick={() => printRequisition(r, threshold)}><Printer size={13} /> Requisition</Btn>
        <Btn small onClick={() => printComparison(r)}><Printer size={13} /> Comparison sheet</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: 13 }}>
        {[
          ['Event', r.event], ['Department', r.department], ['Budget head', r.category],
          ['Estimate', lkr(r.estimated_amount)], ['Budgeted', r.budgeted_amount != null ? lkr(r.budgeted_amount) : 'Not budgeted'], ['Quantity', r.quantity ?? ''],
          ['Requested by', r.requested_by], ['Dept head signed', `${r.head_name}${r.head_signed_on ? ', ' + fmtDate(r.head_signed_on) : ''}`], ['Needed by', fmtDate(r.needed_by)],
        ].map(([k, v]) => <div key={String(k)}><div style={{ fontSize: 11, color: C.sub, fontWeight: 600 }}>{k}</div><div style={{ marginTop: 2 }}>{String(v)}</div></div>)}
      </div>
      {r.details && <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', background: C.soft, padding: 12, borderRadius: 10, marginTop: 12 }}>{r.details}</p>}
      {r.form_url && <a href={r.form_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.blue }}>View signed form</a>}

      <div style={{ fontSize: 12.5, color: C.sub, marginTop: 12, lineHeight: 1.7 }}>
        {r.cfo_at && <div>CFO: <b style={{ color: C.ink }}>{r.cfo_name}</b> {fmtDateTime(r.cfo_at)}{r.cfo_note ? `, "${r.cfo_note}"` : ''}</div>}
        {r.second_at && <div>Chairperson: <b style={{ color: C.ink }}>{r.second_name}</b> {fmtDateTime(r.second_at)}{r.second_note ? `, "${r.second_note}"` : ''}</div>}
        {r.reject_reason && <div style={{ color: C.red }}>Rejected: {r.reject_reason}</div>}
      </div>

      {(canCfo || canSecond) && (
        <div style={{ ...card, background: C.soft, border: 'none', marginTop: 14 }}>
          <b style={{ fontSize: 13 }}>{canCfo ? 'CFO decision' : 'Chairperson decision'}</b>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (required when rejecting)" style={{ marginTop: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn kind="ok" disabled={busy} onClick={() => run({ action: canCfo ? 'req.cfo' : 'req.second', id: r.id, decision: 'approve', note })}><Check size={14} /> Approve{canCfo && big ? ' and send to Chairperson' : ''}</Btn>
            <Btn kind="danger" disabled={busy} onClick={() => run({ action: canCfo ? 'req.cfo' : 'req.second', id: r.id, decision: 'reject', note })}><XIcon size={14} /> Reject</Btn>
          </div>
        </div>
      )}
      {me.cfo && r.status === 'pending_cfo' && big && d.me.role !== 'cfo' && (
        <p style={{ fontSize: 12.5, color: C.amber, marginTop: 10 }}>This is above the limit, so the CFO approves first. You will approve it as Chairperson after that.</p>
      )}

      <h4 style={{ fontSize: 13, margin: '18px 0 8px' }}>Quotations (procurement comparison)</h4>
      {quotes.length < 2 && <p style={{ fontSize: 12, color: C.amber, margin: '0 0 8px' }}>Collect at least 2 to 3 quotations before choosing a vendor.</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {quotes.map((x) => (
            <tr key={x.id}>
              <td style={td}><b>{x.vendor}</b>{x.selected && <span style={{ marginLeft: 6, fontSize: 11, color: C.green, fontWeight: 700 }}>CHOSEN</span>}<div style={{ fontSize: 11, color: C.sub }}>{[x.contact, x.notes].filter(Boolean).join(' / ')}</div></td>
              <td style={tdNum}>{lkr(x.amount)}</td>
              <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                {x.file_url && <a href={x.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.blue, marginRight: 8 }}>Quote</a>}
                {me.pay && !quotesLocked && !x.selected && <Btn small onClick={() => run({ action: 'quote.select', id: x.id })}><Star size={12} /> Choose</Btn>}
                {me.create && !quotesLocked && <span style={{ marginLeft: 6 }}><Btn small kind="danger" onClick={() => run({ action: 'quote.remove', id: x.id })}><Trash2 size={12} /></Btn></span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {me.create && !quotesLocked && !['rejected', 'cancelled'].includes(r.status) && (qf ? (
        <div style={{ ...card, marginTop: 10 }}>
          <Grid>
            <Field label="Vendor *"><Input value={qf.vendor} onChange={(e) => setQf({ ...qf, vendor: e.target.value })} /></Field>
            <Field label="Quoted amount (LKR) *"><Input type="number" value={qf.amount} onChange={(e) => setQf({ ...qf, amount: e.target.value })} /></Field>
            <Field label="Contact"><Input value={qf.contact} onChange={(e) => setQf({ ...qf, contact: e.target.value })} /></Field>
            <Field label="Notes"><Input value={qf.notes} onChange={(e) => setQf({ ...qf, notes: e.target.value })} /></Field>
            <FileField label="Quotation file" value={qf.file_url} onChange={(u) => setQf({ ...qf, file_url: u })} />
          </Grid>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn kind="primary" disabled={busy} onClick={() => run({ action: 'quote.add', requisition_id: r.id, ...qf }, () => setQf(null))}>Add quotation</Btn>
            <Btn onClick={() => setQf(null)}>Cancel</Btn>
          </div>
        </div>
      ) : <div style={{ marginTop: 10 }}><Btn small onClick={() => setQf({ vendor: '', amount: '', contact: '', notes: '', file_url: '' })}><Plus size={13} /> Add quotation</Btn></div>)}

      {r.status === 'approved' && (
        <div style={{ ...card, marginTop: 18, borderColor: pv ? C.line : C.ink }}>
          <b style={{ fontSize: 13 }}>Payment voucher</b>
          {pv ? (
            <p style={{ fontSize: 13, marginTop: 6 }}>{pv.pv_no} for {pv.payee}, {lkr(pv.actual_amount)}. <Badge status={pv.status} label={STATUS_LABEL[pv.status]} /> Manage it under Payment vouchers.</p>
          ) : me.pay ? (pf ? (
            <>
              <Grid>
                <Field label="Pay to *"><Input value={pf.payee} onChange={(e) => setPf({ ...pf, payee: e.target.value })} /></Field>
                <Field label="Actual amount (LKR) *" hint={`Approved: ${lkr(r.estimated_amount)}. Cannot be more.`}><Input type="number" value={pf.actual_amount} onChange={(e) => setPf({ ...pf, actual_amount: e.target.value })} /></Field>
                <Field label="Pay by"><Select value={pf.payment_method} onChange={(e) => setPf({ ...pf, payment_method: e.target.value })} options={[['bank', 'Bank transfer / cheque'], ['cash', 'Cash'], ['petty_cash', 'Petty cash']]} /></Field>
                <Field label="Description" span2><Input value={pf.description} onChange={(e) => setPf({ ...pf, description: e.target.value })} /></Field>
              </Grid>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Btn kind="primary" disabled={busy} onClick={() => run({ action: 'pv.create', requisition_id: r.id, ...pf, quantity: r.quantity, budgeted_amount: r.budgeted_amount }, () => setPf(null))}>Authorise voucher</Btn>
                <Btn onClick={() => setPf(null)}>Cancel</Btn>
              </div>
            </>
          ) : (
            <div style={{ marginTop: 8 }}>
              <Btn kind="primary" onClick={() => setPf({ payee: sel?.vendor || '', actual_amount: String(sel?.amount ?? r.estimated_amount), payment_method: 'bank', description: r.title, quotation_id: sel?.id || '' })}>Issue payment voucher</Btn>
            </div>
          )) : <p style={{ fontSize: 12.5, color: C.sub, marginTop: 6 }}>Approved. The CFO will issue the payment voucher.</p>}
        </div>
      )}

      <FormError text={err} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        {me.create && ['pending_cfo', 'pending_second'].includes(r.status)
          ? <Btn kind="danger" disabled={busy} onClick={() => { if (confirm('Cancel this requisition?')) run({ action: 'req.cancel', id: r.id }) }}>Cancel requisition</Btn>
          : <span />}
        <Btn onClick={onClose}>Close</Btn>
      </div>
    </Modal>
  )
}
