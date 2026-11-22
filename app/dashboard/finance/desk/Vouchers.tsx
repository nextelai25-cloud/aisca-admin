'use client'
import React, { useMemo, useState } from 'react'
import { Printer, Banknote, Ban } from 'lucide-react'
import { lkr, fmtDate, STATUS_LABEL, type FinVoucher } from '@/lib/fin'
import { printVoucher } from '@/lib/fin-print'
import type { DeskProps } from './FinanceDesk'
import { C, card, th, td, tdNum, Btn, Badge, Modal, Field, Grid, Input, Select, FileField, Empty, FormError } from './ui'

const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10)

export default function Vouchers({ d, act, focus }: DeskProps) {
  const [status, setStatus] = useState('authorised')
  const [pay, setPay] = useState<FinVoucher | null>(() => {
    const v = d.vouchers.find((x) => x.id === focus)
    return v && v.status === 'authorised' && d.me.can.pay ? v : null
  })
  const [f, setF] = useState({ paid_on: today(), payment_ref: '', bill_no: '', bill_url: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const threshold = Number(d.settings.approval_threshold)
  const reqById = useMemo(() => new Map(d.requisitions.map((r) => [r.id, r])), [d.requisitions])

  const rows = d.vouchers.filter((v) => status === 'all' || v.status === status)

  async function record() {
    if (!pay) return
    setBusy(true); setErr('')
    const e = await act({ action: 'pv.pay', id: pay.id, ...f })
    setBusy(false)
    if (e) setErr(e); else { setPay(null); setF({ paid_on: today(), payment_ref: '', bill_no: '', bill_url: '' }) }
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <b style={{ fontSize: 15, marginRight: 'auto' }}>Payment vouchers</b>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 170 }}
          options={[['authorised', 'To be paid'], ['paid', 'Paid & recorded'], ['void', 'Void'], ['all', 'All']]} />
      </div>
      <p style={{ fontSize: 12.5, color: C.sub, marginTop: 0 }}>A voucher is issued from an approved requisition (open it under Requisitions). Only paid vouchers with the original bill are posted to the ledger.</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Voucher</th><th style={th}>Pay to</th><th style={th}>Requisition</th><th style={{ ...th, textAlign: 'right' }}>Amount</th><th style={th}>Status</th><th style={th}></th></tr></thead>
          <tbody>
            {rows.map((v) => {
              const r = reqById.get(v.requisition_id)
              return (
                <tr key={v.id}>
                  <td style={td}><b>{v.pv_no}</b><div style={{ fontSize: 11, color: C.sub }}>{fmtDate(v.prepared_at)} by {v.prepared_name}</div></td>
                  <td style={td}>{v.payee}<div style={{ fontSize: 11, color: C.sub }}>{v.payment_method.replace('_', ' ')}{v.payment_ref ? ` / ${v.payment_ref}` : ''}</div></td>
                  <td style={td}>{r ? `${r.req_no} ${r.title}` : ''}<div style={{ fontSize: 11, color: C.sub }}>{r?.event}</div></td>
                  <td style={tdNum}>{lkr(v.actual_amount)}</td>
                  <td style={td}><Badge status={v.status} label={STATUS_LABEL[v.status]} />{v.paid_on && <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>{fmtDate(v.paid_on)}</div>}</td>
                  <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {r && <Btn small onClick={() => printVoucher(v, r, threshold)}><Printer size={12} /> Print</Btn>}
                    {d.me.can.pay && v.status === 'authorised' && <>
                      <span style={{ marginLeft: 6 }}><Btn small kind="primary" onClick={() => { setErr(''); setPay(v) }}><Banknote size={12} /> Pay</Btn></span>
                      <span style={{ marginLeft: 6 }}><Btn small kind="danger" onClick={async () => { const reason = prompt('Reason for voiding this voucher?'); if (reason) { const e = await act({ action: 'pv.void', id: v.id, reason }); if (e) alert(e) } }}><Ban size={12} /></Btn></span>
                    </>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && <Empty text="No vouchers here." />}
      </div>

      {pay && (
        <Modal title={`Record payment ${pay.pv_no}`} onClose={() => setPay(null)}>
          <p style={{ fontSize: 13, marginTop: 0 }}>Pay <b>{lkr(pay.actual_amount)}</b> to <b>{pay.payee}</b> by {pay.payment_method.replace('_', ' ')}.</p>
          <Grid>
            <Field label="Paid on"><Input type="date" value={f.paid_on} onChange={(e) => setF({ ...f, paid_on: e.target.value })} /></Field>
            <Field label={pay.payment_method === 'bank' ? 'Bank / cheque reference *' : 'Reference'}><Input value={f.payment_ref} onChange={(e) => setF({ ...f, payment_ref: e.target.value })} /></Field>
            <Field label="Original bill / invoice no. *" hint="Checked so the same bill is never paid twice"><Input value={f.bill_no} onChange={(e) => setF({ ...f, bill_no: e.target.value })} /></Field>
            <FileField label="Original bill" required value={f.bill_url} onChange={(u) => setF({ ...f, bill_url: u })} />
          </Grid>
          <FormError text={err} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn onClick={() => setPay(null)}>Cancel</Btn>
            <Btn kind="primary" disabled={busy} onClick={record}>{busy ? 'Recording...' : 'Mark paid and record'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
