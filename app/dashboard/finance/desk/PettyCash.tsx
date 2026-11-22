'use client'
import React, { useState } from 'react'
import { Printer, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { PETTY_COLUMNS, PETTY_DEFAULT_FLOAT, PETTY_DEFAULT_MAX, pettyColumn, lkr, fmtDate } from '@/lib/fin'
import { printPettyBook, printPettyVoucher, PETTY_CODES } from '@/lib/fin-print'
import type { DeskProps } from './FinanceDesk'
import { eventOptions } from './Requisitions'
import { C, card, th, td, tdNum, Btn, Modal, Field, Grid, Input, Select, FileField, Empty, FormError, Stat } from './ui'

const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10)
const blankSpend = { amount: '', purpose: '', paid_to: '', event: 'General', category: PETTY_COLUMNS[0], bill_no: '', bill_url: '', no_bill: false, entry_date: today() }

export default function PettyCash({ d, act }: DeskProps) {
  const float = Number(d.settings.petty_float) || PETTY_DEFAULT_FLOAT
  const max = Number(d.settings.petty_max_spend) || PETTY_DEFAULT_MAX
  const [spend, setSpend] = useState<typeof blankSpend | null>(null)
  const [restore, setRestore] = useState<{ reference: string; entry_date: string } | null>(null)
  const [limits, setLimits] = useState({ petty_float: String(float), petty_max_spend: String(max) })
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const events = eventOptions(d.petty.map((p) => p.event))

  const signed = d.petty.map((p) => (p.entry_type === 'top_up' ? 1 : -1) * Number(p.amount))
  const rows = d.petty.map((p, i) => ({ ...p, bal: signed.slice(0, i + 1).reduce((a, b) => a + b, 0) }))
  const bal = signed.reduce((a, b) => a + b, 0)
  const lastTop = d.petty.map((p) => p.entry_type).lastIndexOf('top_up')
  const sinceRestore = d.petty.slice(lastTop + 1).filter((p) => p.entry_type === 'spend')
  const colTotals = Object.fromEntries(PETTY_COLUMNS.map((c) => [c, sinceRestore.filter((p) => pettyColumn(p.category) === c).reduce((s, p) => s + Number(p.amount), 0)]))
  const toRestore = Math.max(0, float - bal)
  const low = bal < float * 0.25

  const run = async (body: Record<string, unknown>, after?: () => void) => {
    setBusy(true); setErr(''); setMsg('')
    const e = await act(body)
    setBusy(false)
    if (e) setErr(e); else after?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        <Stat label="Imprest float" value={lkr(float)} sub={`Up to ${lkr(max)} per payment`} />
        <Stat label="Cash in hand (book)" value={lkr(bal)} sub={low ? 'Running low: restore the float' : 'Count the box; it should match'} />
        <Stat label="Spent since last restore" value={lkr(sinceRestore.reduce((s, p) => s + Number(p.amount), 0))} sub={`${sinceRestore.length} vouchers`} />
        <Stat label="Needed to restore float" value={lkr(toRestore)} />
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <b style={{ fontSize: 15, marginRight: 'auto' }}>Petty cash book (imprest)</b>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 150 }} title="From" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 150 }} title="To" />
          <Btn onClick={() => printPettyBook(d.petty, float, from || undefined, to || undefined)}><Printer size={14} /> Print book</Btn>
          {d.me.can.pay && <>
            <Btn disabled={toRestore <= 0} onClick={() => { setErr(''); setRestore({ reference: '', entry_date: today() }) }}><ArrowDownLeft size={14} /> {d.petty.length ? 'Restore float' : 'Open the float'}</Btn>
            <Btn kind="primary" disabled={bal <= 0} onClick={() => { setErr(''); setSpend({ ...blankSpend }) }}><ArrowUpRight size={14} /> Pay out</Btn>
          </>}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {PETTY_COLUMNS.map((c) => (
            <div key={c} style={{ background: C.soft, borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
              <span style={{ color: C.sub }}>{PETTY_CODES[c]} {c}</span> <b style={{ marginLeft: 6 }}>{lkr(colTotals[c])}</b>
            </div>
          ))}
          <span style={{ fontSize: 11.5, color: C.sub, alignSelf: 'center' }}>since the last restoration</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
            <thead><tr>
              <th style={{ ...th, textAlign: 'right' }}>Receipts</th><th style={th}>Date</th><th style={th}>PCV</th><th style={th}>Particulars</th>
              <th style={{ ...th, textAlign: 'right' }}>Total paid</th>
              {PETTY_COLUMNS.map((c) => <th key={c} style={{ ...th, textAlign: 'right', whiteSpace: 'normal', minWidth: 86 }}>{c}</th>)}
              <th style={{ ...th, textAlign: 'right' }}>Balance</th><th style={th}></th>
            </tr></thead>
            <tbody>
              {[...rows].reverse().map((p) => {
                const col = pettyColumn(p.category)
                return (
                  <tr key={p.id} style={p.entry_type === 'top_up' ? { background: '#F7FBF8' } : undefined}>
                    <td style={tdNum}>{p.entry_type === 'top_up' ? lkr(p.amount) : ''}</td>
                    <td style={td}>{fmtDate(p.entry_date)}</td>
                    <td style={td}><b>{p.pc_no}</b></td>
                    <td style={td}>{p.entry_type === 'top_up' ? p.purpose : <>{p.paid_to && <b>{p.paid_to}: </b>}{p.purpose}</>}
                      <div style={{ fontSize: 11, color: C.sub }}>{p.entry_type === 'top_up' ? (p.reference ? `Ref ${p.reference}` : '') : <>{p.event}{p.bill_url ? <> / <a href={p.bill_url} target="_blank" rel="noreferrer" style={{ color: C.blue }}>Bill {p.bill_no}</a></> : ' / no bill'}</>}</div></td>
                    <td style={tdNum}>{p.entry_type === 'spend' ? lkr(p.amount) : ''}</td>
                    {PETTY_COLUMNS.map((c) => <td key={c} style={tdNum}>{p.entry_type === 'spend' && col === c ? lkr(p.amount) : ''}</td>)}
                    <td style={{ ...tdNum, fontWeight: 600 }}>{lkr(p.bal)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{p.entry_type === 'spend' && <Btn small onClick={() => printPettyVoucher(p, float)}><Printer size={12} /> PCV</Btn>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && <Empty text="No petty cash yet. Start by opening the float." />}
        </div>
      </div>

      {d.me.can.settings && (
        <div style={card}>
          <b style={{ fontSize: 15 }}>Petty cash limits</b>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 10 }}>
            <Field label="Imprest float (LKR)"><Input type="number" value={limits.petty_float} onChange={(e) => setLimits({ ...limits, petty_float: e.target.value })} style={{ width: 170 }} /></Field>
            <Field label="Most per payment (LKR)"><Input type="number" value={limits.petty_max_spend} onChange={(e) => setLimits({ ...limits, petty_max_spend: e.target.value })} style={{ width: 170 }} /></Field>
            <Btn disabled={busy} onClick={() => run({ action: 'petty.settings', ...limits }, () => setMsg('Saved'))}>Save limits</Btn>
            {msg && <span style={{ fontSize: 12, color: C.green }}>{msg}</span>}
          </div>
          {!spend && !restore && <FormError text={err} />}
        </div>
      )}

      {spend && (
        <Modal title="Petty cash payment" onClose={() => setSpend(null)} wide>
          <p style={{ fontSize: 12.5, color: C.sub, marginTop: 0 }}>Cash in hand {lkr(bal)}. Up to {lkr(max)} per payment; anything larger goes through a requisition and payment voucher.</p>
          <Grid>
            <Field label="Paid to *"><Input value={spend.paid_to} onChange={(e) => setSpend({ ...spend, paid_to: e.target.value })} placeholder="Person who received the cash" /></Field>
            <Field label="Amount (LKR) *" hint={Number(spend.amount) > max ? `Above the ${lkr(max)} limit` : undefined}><Input type="number" value={spend.amount} onChange={(e) => setSpend({ ...spend, amount: e.target.value })} /></Field>
            <Field label="Account (analysis column)"><Select value={spend.category} onChange={(e) => setSpend({ ...spend, category: e.target.value })} options={PETTY_COLUMNS.map((c) => [c, `${PETTY_CODES[c]} ${c}`] as [string, string])} /></Field>
            <Field label="Date"><Input type="date" value={spend.entry_date} onChange={(e) => setSpend({ ...spend, entry_date: e.target.value })} /></Field>
            <Field label="Description of the payment *" span2><Input value={spend.purpose} onChange={(e) => setSpend({ ...spend, purpose: e.target.value })} placeholder="e.g. Three wheeler to UCFM site visit and back" /></Field>
            <Field label="Event / project"><Input list="fin-events-pc" value={spend.event} onChange={(e) => setSpend({ ...spend, event: e.target.value })} /></Field>
            <Field label="Bill">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={spend.no_bill} onChange={(e) => setSpend({ ...spend, no_bill: e.target.checked })} />
                No bill (bus fare etc.; the receiver signs the voucher)
              </label>
            </Field>
            {!spend.no_bill && <>
              <Field label="Bill no. *"><Input value={spend.bill_no} onChange={(e) => setSpend({ ...spend, bill_no: e.target.value })} /></Field>
              <FileField label="Bill" required value={spend.bill_url} onChange={(u) => setSpend({ ...spend, bill_url: u })} />
            </>}
          </Grid>
          <datalist id="fin-events-pc">{events.map((e) => <option key={e} value={e} />)}</datalist>
          <FormError text={err} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn onClick={() => setSpend(null)}>Cancel</Btn>
            <Btn kind="primary" disabled={busy} onClick={() => run({ action: 'pc.create', entry_type: 'spend', ...spend }, () => setSpend(null))}>{busy ? 'Saving...' : 'Record payment'}</Btn>
          </div>
          <p style={{ fontSize: 12, color: C.sub, marginBottom: 0 }}>After saving, print the petty cash voucher (PCV) from the book and get it signed.</p>
        </Modal>
      )}

      {restore && (
        <Modal title={d.petty.length ? 'Restore the float' : 'Open the float'} onClose={() => setRestore(null)}>
          <p style={{ fontSize: 13, marginTop: 0, lineHeight: 1.6 }}>
            Draw <b>{lkr(toRestore)}</b> from the bank and put it in the box. That brings the cash back to the float of <b>{lkr(float)}</b>
            {d.petty.length ? <>, and it equals what was paid out since the last restoration.</> : '.'}
          </p>
          <Grid>
            <Field label="Cheque no. / bank withdrawal ref *"><Input value={restore.reference} onChange={(e) => setRestore({ ...restore, reference: e.target.value })} /></Field>
            <Field label="Date"><Input type="date" value={restore.entry_date} onChange={(e) => setRestore({ ...restore, entry_date: e.target.value })} /></Field>
          </Grid>
          <FormError text={err} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn onClick={() => setRestore(null)}>Cancel</Btn>
            <Btn kind="primary" disabled={busy} onClick={() => run({ action: 'pc.create', entry_type: 'top_up', ...restore }, () => setRestore(null))}>{busy ? 'Saving...' : `Record ${lkr(toRestore)} received`}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
