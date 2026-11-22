import { NextRequest, NextResponse } from 'next/server'
import {
  svc, finCaller, finCan, finMe, cleanFileUrl, str, num, day, logDoc, getThreshold,
  registerBill, releaseBill, postLedger,
} from '@/lib/fin-server'
import { FIN_INCOME_SOURCES, needsSecond, lkr } from '@/lib/fin'
import type { Caller } from '@/lib/rangeela-server'

export const dynamic = 'force-dynamic'

// Finance Desk API (CFO process).
//   GET                 everything the desk needs + who am I
//   POST { action, ... } one action; the server checks the caller's role for each

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const SETUP = 'Finance Desk tables are not set up yet. Run supabase/finance-docs.sql in Supabase first.'
function dbError(e: { message: string; code?: string }) {
  console.error('[fin]', e.message)
  if (e.code === '42P01' || /does not exist|schema cache/i.test(e.message)) return bad(SETUP, 500)
  if (e.code === '23514') return bad('Some values are not allowed. Check the amounts and try again.', 400)
  if (e.code === '23505') return bad('This document already exists.', 409)
  return bad('Database error. Please try again.', 500)
}
const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10)
const ok = (extra: Record<string, unknown> = {}) => NextResponse.json({ ok: true, ...extra })

export async function GET(req: NextRequest) {
  const c = await finCaller(req)
  if (!c) return bad('Not allowed', 403)
  const db = svc()
  const r = await Promise.all([
    db.from('fin_settings').select('*').eq('id', 1).maybeSingle(),
    db.from('fin_requisitions').select('*').order('created_at', { ascending: false }).limit(2000),
    db.from('fin_quotations').select('*').order('amount', { ascending: true }).limit(5000),
    db.from('fin_vouchers').select('*').order('created_at', { ascending: false }).limit(2000),
    db.from('fin_reimbursements').select('*').order('created_at', { ascending: false }).limit(2000),
    db.from('fin_income_receipts').select('*').order('received_on', { ascending: false }).limit(2000),
    db.from('fin_petty_cash').select('*').order('entry_date', { ascending: true }).order('created_at', { ascending: true }).limit(5000),
    db.from('fin_doc_log').select('*').order('at', { ascending: false }).limit(100),
  ])
  for (const x of r) if (x.error) return dbError(x.error)
  const quotes = r[2].data ?? []
  const requisitions = (r[1].data ?? []).map((q) => ({ ...q, quotations: quotes.filter((x) => x.requisition_id === q.id) }))
  return NextResponse.json({
    settings: r[0].data ?? { id: 1, approval_threshold: 100000, second_approver: 'chairman', updated_by: null, updated_at: null },
    requisitions, vouchers: r[3].data ?? [], reimbursements: r[4].data ?? [], income: r[5].data ?? [],
    petty: r[6].data ?? [], log: r[7].data ?? [], me: finMe(c),
  }, { headers: { 'Cache-Control': 'no-store' } })
}

type Body = Record<string, unknown> & { action?: string; id?: string }

export async function POST(req: NextRequest) {
  const c = await finCaller(req)
  if (!c) return bad('Not allowed', 403)
  const b = (await req.json().catch(() => ({}))) as Body
  const handler = HANDLERS[String(b.action || '')]
  if (!handler) return bad('Unknown action')
  try {
    return await handler(c, b)
  } catch (e) {
    console.error('[fin] action failed', b.action, e)
    return bad('Something went wrong. Please try again.', 500)
  }
}

type H = (c: Caller, b: Body) => Promise<NextResponse>
const need = (c: Caller, a: Parameters<typeof finCan>[1]) => (finCan(c.role, a) ? null : bad('Your role cannot do this.', 403))

const HANDLERS: Record<string, H> = {
  // ---------------- Requisitions ----------------
  async 'req.create'(c, b) {
    const deny = need(c, 'create'); if (deny) return deny
    const row = {
      event: str(b.event, 80) || 'General', department: str(b.department, 80), category: str(b.category, 80),
      title: str(b.title, 160), details: str(b.details, 2000), quantity: num(b.quantity),
      budgeted_amount: num(b.budgeted_amount), estimated_amount: num(b.estimated_amount), needed_by: day(b.needed_by),
      requested_by: str(b.requested_by, 120), head_name: str(b.head_name, 120), head_signed_on: day(b.head_signed_on),
      form_url: cleanFileUrl(b.form_url), created_by: c.email,
    }
    if (!row.department || !row.category || !row.title || !row.requested_by) return bad('Fill in department, category, title and who requested it.')
    if (!row.estimated_amount || row.estimated_amount <= 0) return bad('Enter the estimated amount.')
    if (!row.head_name) return bad('The department head must sign the requisition before it goes to the CFO. Enter their name.')
    const { data, error } = await svc().from('fin_requisitions').insert(row).select('*').single()
    if (error) return dbError(error)
    await logDoc(c, 'requisition', data.id, data.req_no, 'created', `${row.title} ${lkr(row.estimated_amount)}`)
    return ok({ row: data })
  },

  async 'req.cancel'(c, b) {
    const deny = need(c, 'create'); if (deny) return deny
    const { data, error } = await svc().from('fin_requisitions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', String(b.id)).in('status', ['pending_cfo', 'pending_second']).select('id, req_no').maybeSingle()
    if (error) return dbError(error)
    if (!data) return bad('Only a requisition that is still waiting for approval can be cancelled.', 409)
    await logDoc(c, 'requisition', data.id, data.req_no, 'cancelled')
    return ok()
  },

  async 'req.cfo'(c, b) {
    const deny = need(c, 'cfo'); if (deny) return deny
    const { data: r } = await svc().from('fin_requisitions').select('*').eq('id', String(b.id)).maybeSingle()
    if (!r) return bad('Requisition not found.', 404)
    if (r.status !== 'pending_cfo') return bad('This requisition is no longer waiting for the CFO. Refresh.', 409)
    const threshold = await getThreshold()
    const big = needsSecond(r.estimated_amount, threshold)
    const note = str(b.note, 1000)
    let patch: Record<string, unknown>
    if (b.decision === 'reject') {
      if (!note) return bad('Give a reason for rejecting.')
      patch = { status: 'rejected', reject_reason: note }
    } else {
      if (big && c.role !== 'cfo') return bad(`Above ${lkr(threshold)} the CFO must approve first, then the Chairperson.`, 403)
      patch = { status: big ? 'pending_second' : 'approved' }
    }
    Object.assign(patch, { cfo_by: c.email, cfo_name: c.name, cfo_at: new Date().toISOString(), cfo_note: note, updated_at: new Date().toISOString() })
    const { data, error } = await svc().from('fin_requisitions').update(patch).eq('id', r.id).eq('status', 'pending_cfo').select('*').maybeSingle()
    if (error) return dbError(error)
    if (!data) return bad('Someone else already acted on this. Refresh.', 409)
    await logDoc(c, 'requisition', r.id, r.req_no, b.decision === 'reject' ? 'cfo_rejected' : 'cfo_approved', note)
    return ok({ row: data })
  },

  async 'req.second'(c, b) {
    const deny = need(c, 'second'); if (deny) return deny
    const { data: r } = await svc().from('fin_requisitions').select('*').eq('id', String(b.id)).maybeSingle()
    if (!r) return bad('Requisition not found.', 404)
    if (r.status !== 'pending_second') return bad('This requisition is not waiting for the Chairperson. Refresh.', 409)
    if ((r.cfo_by || '').toLowerCase() === c.email) return bad('The second approval must come from a different person.', 403)
    const note = str(b.note, 1000)
    if (b.decision === 'reject' && !note) return bad('Give a reason for rejecting.')
    const patch = {
      status: b.decision === 'reject' ? 'rejected' : 'approved', reject_reason: b.decision === 'reject' ? note : null,
      second_by: c.email, second_name: c.name, second_at: new Date().toISOString(), second_note: note, updated_at: new Date().toISOString(),
    }
    const { data, error } = await svc().from('fin_requisitions').update(patch).eq('id', r.id).eq('status', 'pending_second').select('*').maybeSingle()
    if (error) return dbError(error)
    if (!data) return bad('Someone else already acted on this. Refresh.', 409)
    await logDoc(c, 'requisition', r.id, r.req_no, b.decision === 'reject' ? 'second_rejected' : 'second_approved', note)
    return ok({ row: data })
  },

  // ---------------- Procurement comparison ----------------
  async 'quote.add'(c, b) {
    const deny = need(c, 'create'); if (deny) return deny
    const row = {
      requisition_id: String(b.requisition_id || ''), vendor: str(b.vendor, 160), amount: num(b.amount),
      contact: str(b.contact, 160), notes: str(b.notes, 1000), file_url: cleanFileUrl(b.file_url), created_by: c.email,
    }
    if (!row.vendor || row.amount === null || row.amount < 0) return bad('Enter the vendor and the quoted amount.')
    const { data: r } = await svc().from('fin_requisitions').select('id, req_no, status').eq('id', row.requisition_id).maybeSingle()
    if (!r) return bad('Requisition not found.', 404)
    const { data: pv } = await svc().from('fin_vouchers').select('id').eq('requisition_id', r.id).neq('status', 'void').maybeSingle()
    if (pv) return bad('A payment voucher is already issued. Quotations are locked.', 409)
    const { data, error } = await svc().from('fin_quotations').insert(row).select('*').single()
    if (error) return dbError(error)
    await logDoc(c, 'requisition', r.id, r.req_no, 'quotation_added', `${row.vendor} ${lkr(row.amount)}`)
    return ok({ row: data })
  },

  async 'quote.remove'(c, b) {
    const deny = need(c, 'create'); if (deny) return deny
    const { data: q } = await svc().from('fin_quotations').select('*').eq('id', String(b.id)).maybeSingle()
    if (!q) return bad('Quotation not found.', 404)
    const { data: pv } = await svc().from('fin_vouchers').select('id').eq('requisition_id', q.requisition_id).neq('status', 'void').maybeSingle()
    if (pv) return bad('A payment voucher is already issued. Quotations are locked.', 409)
    const { error } = await svc().from('fin_quotations').delete().eq('id', q.id)
    if (error) return dbError(error)
    await logDoc(c, 'requisition', q.requisition_id, null, 'quotation_removed', q.vendor)
    return ok()
  },

  async 'quote.select'(c, b) {
    const deny = need(c, 'pay'); if (deny) return deny
    const { data: q } = await svc().from('fin_quotations').select('*').eq('id', String(b.id)).maybeSingle()
    if (!q) return bad('Quotation not found.', 404)
    const { data: pv } = await svc().from('fin_vouchers').select('id').eq('requisition_id', q.requisition_id).neq('status', 'void').maybeSingle()
    if (pv) return bad('A payment voucher is already issued. Quotations are locked.', 409)
    await svc().from('fin_quotations').update({ selected: false }).eq('requisition_id', q.requisition_id)
    const { error } = await svc().from('fin_quotations').update({ selected: true }).eq('id', q.id)
    if (error) return dbError(error)
    await logDoc(c, 'requisition', q.requisition_id, null, 'quotation_selected', `${q.vendor} ${lkr(q.amount)}`)
    return ok()
  },

  // ---------------- Payment vouchers ----------------
  async 'pv.create'(c, b) {
    const deny = need(c, 'pay'); if (deny) return deny
    const { data: r } = await svc().from('fin_requisitions').select('*').eq('id', String(b.requisition_id)).maybeSingle()
    if (!r) return bad('Requisition not found.', 404)
    if (r.status !== 'approved') return bad('A payment voucher can only be issued for an approved requisition.', 409)
    const actual = num(b.actual_amount)
    if (!actual || actual <= 0) return bad('Enter the actual amount to be paid.')
    if (actual > Number(r.estimated_amount)) {
      return bad(`The actual amount is above the approved ${lkr(r.estimated_amount)}. Raise a new requisition for the difference.`)
    }
    const method = ['bank', 'cash', 'petty_cash'].includes(String(b.payment_method)) ? String(b.payment_method) : 'bank'
    const quotation_id = typeof b.quotation_id === 'string' && b.quotation_id ? b.quotation_id : null
    const payee = str(b.payee, 160)
    if (!payee) return bad('Enter who is being paid.')
    const { data: live } = await svc().from('fin_vouchers').select('id').eq('requisition_id', r.id).neq('status', 'void').maybeSingle()
    if (live) return bad('A voucher already exists for this requisition.', 409)
    const row = {
      requisition_id: r.id, quotation_id, payee, description: str(b.description, 1000) || r.title,
      quantity: num(b.quantity) ?? r.quantity, budgeted_amount: num(b.budgeted_amount) ?? r.budgeted_amount,
      actual_amount: actual, payment_method: method, status: 'authorised',
      prepared_by: c.email, prepared_name: c.name, prepared_at: new Date().toISOString(),
    }
    const { data, error } = await svc().from('fin_vouchers').insert(row).select('*').single()
    if (error) return dbError(error)
    await logDoc(c, 'voucher', data.id, data.pv_no, 'authorised', `${r.req_no} ${payee} ${lkr(actual)}`)
    return ok({ row: data })
  },

  async 'pv.pay'(c, b) {
    const deny = need(c, 'pay'); if (deny) return deny
    const { data: v } = await svc().from('fin_vouchers').select('*').eq('id', String(b.id)).maybeSingle()
    if (!v) return bad('Voucher not found.', 404)
    if (v.status !== 'authorised') return bad('Only an authorised voucher can be paid.', 409)
    const { data: r } = await svc().from('fin_requisitions').select('*').eq('id', v.requisition_id).single()
    const bill_no = str(b.bill_no, 80)
    const bill_url = cleanFileUrl(b.bill_url)
    if (!bill_no || !bill_url) return bad('Attach the original bill or invoice and enter its number before recording the payment.')
    const paid_on = day(b.paid_on) || today()
    const payment_ref = str(b.payment_ref, 120)
    if (v.payment_method === 'bank' && !payment_ref) return bad('Enter the bank transfer or cheque reference.')

    if (v.payment_method === 'petty_cash') {
      const bal = await pettyBalance()
      if (Number(v.actual_amount) > bal) return bad(`Petty cash has only ${lkr(bal)}. Top it up first or pay by bank.`)
    }
    // 1. claim the voucher
    const { data: claimed } = await svc().from('fin_vouchers')
      .update({ status: 'paid', paid_by: c.email, paid_name: c.name, paid_at: new Date().toISOString(), paid_on, payment_ref, bill_no, bill_url })
      .eq('id', v.id).eq('status', 'authorised').select('*').maybeSingle()
    if (!claimed) return bad('Someone else already recorded this payment. Refresh.', 409)
    const undo = async () => {
      await svc().from('fin_vouchers').update({ status: 'authorised', paid_by: null, paid_name: null, paid_at: null, paid_on: null, payment_ref: null, bill_no: null, bill_url: null }).eq('id', v.id)
    }
    // 2. seal the bill (no double submission)
    const reg = await registerBill(c, bill_no, 'voucher', v.id, v.pv_no)
    if (!reg.ok) { await undo(); return bad(reg.error, 409) }
    // 3. post to the ledger (only approved, paid vouchers reach the financial statements)
    const led = await postLedger(c, {
      type: 'expense', category: r.category, amount: Number(v.actual_amount), date: paid_on,
      description: `${v.pv_no} / ${r.req_no}: ${r.title} (${v.payee})`,
      cash_or_bank: v.payment_method === 'bank' ? 'bank' : 'cash', event: r.event,
      bill_url, bill_no, bank_ref: payment_ref,
    })
    if ('error' in led) { await releaseBill(v.id); await undo(); return bad(led.error, 500) }
    await svc().from('fin_vouchers').update({ ledger_id: led.id }).eq('id', v.id)
    if (v.payment_method === 'petty_cash') {
      await svc().from('fin_petty_cash').insert({
        entry_type: 'spend', amount: v.actual_amount, purpose: `${v.pv_no}: ${r.title} (${v.payee})`, event: r.event,
        category: r.category, bill_no, bill_url, entry_date: paid_on, ledger_id: led.id, voucher_id: v.id,
        recorded_by: c.email, recorded_name: c.name,
      })
    }
    await logDoc(c, 'voucher', v.id, v.pv_no, 'paid_recorded', `${lkr(v.actual_amount)} bill ${bill_no}`)
    return ok()
  },

  async 'pv.void'(c, b) {
    const deny = need(c, 'pay'); if (deny) return deny
    const reason = str(b.reason, 500)
    if (!reason) return bad('Give a reason for voiding.')
    const { data, error } = await svc().from('fin_vouchers').update({ status: 'void', void_reason: reason })
      .eq('id', String(b.id)).eq('status', 'authorised').select('id, pv_no').maybeSingle()
    if (error) return dbError(error)
    if (!data) return bad('Only an unpaid voucher can be voided. A paid one must be corrected in the ledger by the Chairperson.', 409)
    await logDoc(c, 'voucher', data.id, data.pv_no, 'voided', reason)
    return ok()
  },

  // ---------------- Reimbursements ----------------
  async 'rb.create'(c, b) {
    const deny = need(c, 'create'); if (deny) return deny
    const row = {
      event: str(b.event, 80) || 'General', department: str(b.department, 80), category: str(b.category, 80) || 'Other Expenses',
      claimant: str(b.claimant, 120), purpose: str(b.purpose, 1000), bill_no: str(b.bill_no, 80), bill_date: day(b.bill_date),
      bill_amount: num(b.bill_amount), claim_amount: num(b.claim_amount), bill_url: cleanFileUrl(b.bill_url), created_by: c.email,
    }
    if (!row.claimant || !row.purpose) return bad('Enter who paid and what it was for.')
    if (!row.bill_no || !row.bill_url) return bad('The original bill is mandatory. Attach it and enter its number.')
    if (!row.bill_amount || !row.claim_amount) return bad('Enter the bill amount and the amount claimed.')
    if (row.claim_amount > row.bill_amount) return bad('The amount claimed cannot be more than the bill.')
    const { data, error } = await svc().from('fin_reimbursements').insert(row).select('*').single()
    if (error) return dbError(error)
    const reg = await registerBill(c, row.bill_no, 'reimbursement', data.id, data.rb_no)
    if (!reg.ok) { await svc().from('fin_reimbursements').delete().eq('id', data.id); return bad(reg.error, 409) }
    await logDoc(c, 'reimbursement', data.id, data.rb_no, 'created', `${row.claimant} ${lkr(row.claim_amount)}`)
    return ok({ row: data })
  },

  async 'rb.cfo'(c, b) {
    const deny = need(c, 'cfo'); if (deny) return deny
    const { data: r } = await svc().from('fin_reimbursements').select('*').eq('id', String(b.id)).maybeSingle()
    if (!r) return bad('Claim not found.', 404)
    if (r.status !== 'pending_cfo') return bad('This claim is no longer waiting for the CFO. Refresh.', 409)
    const threshold = await getThreshold()
    const big = needsSecond(r.claim_amount, threshold)
    const reason = str(b.note, 1000)
    if (b.decision === 'reject' && !reason) return bad('Give a reason for rejecting.')
    if (b.decision !== 'reject' && big && c.role !== 'cfo') return bad(`Above ${lkr(threshold)} the CFO must approve first, then the Chairperson.`, 403)
    const patch = {
      status: b.decision === 'reject' ? 'rejected' : big ? 'pending_second' : 'approved',
      reject_reason: b.decision === 'reject' ? reason : null, cfo_by: c.email, cfo_name: c.name, cfo_at: new Date().toISOString(),
    }
    const { data, error } = await svc().from('fin_reimbursements').update(patch).eq('id', r.id).eq('status', 'pending_cfo').select('*').maybeSingle()
    if (error) return dbError(error)
    if (!data) return bad('Someone else already acted on this. Refresh.', 409)
    if (b.decision === 'reject') await releaseBill(r.id) // a corrected claim can be submitted again
    await logDoc(c, 'reimbursement', r.id, r.rb_no, b.decision === 'reject' ? 'cfo_rejected' : 'cfo_approved', reason)
    return ok()
  },

  async 'rb.second'(c, b) {
    const deny = need(c, 'second'); if (deny) return deny
    const { data: r } = await svc().from('fin_reimbursements').select('*').eq('id', String(b.id)).maybeSingle()
    if (!r) return bad('Claim not found.', 404)
    if (r.status !== 'pending_second') return bad('This claim is not waiting for the Chairperson. Refresh.', 409)
    if ((r.cfo_by || '').toLowerCase() === c.email) return bad('The second approval must come from a different person.', 403)
    const reason = str(b.note, 1000)
    if (b.decision === 'reject' && !reason) return bad('Give a reason for rejecting.')
    const { data, error } = await svc().from('fin_reimbursements').update({
      status: b.decision === 'reject' ? 'rejected' : 'approved', reject_reason: b.decision === 'reject' ? reason : null,
      second_by: c.email, second_name: c.name, second_at: new Date().toISOString(),
    }).eq('id', r.id).eq('status', 'pending_second').select('*').maybeSingle()
    if (error) return dbError(error)
    if (!data) return bad('Someone else already acted on this. Refresh.', 409)
    if (b.decision === 'reject') await releaseBill(r.id)
    await logDoc(c, 'reimbursement', r.id, r.rb_no, b.decision === 'reject' ? 'second_rejected' : 'second_approved', reason)
    return ok()
  },

  async 'rb.pay'(c, b) {
    const deny = need(c, 'pay'); if (deny) return deny
    const { data: r } = await svc().from('fin_reimbursements').select('*').eq('id', String(b.id)).maybeSingle()
    if (!r) return bad('Claim not found.', 404)
    if (r.status !== 'approved') return bad('Only an approved claim can be paid.', 409)
    const method = ['bank', 'cash', 'petty_cash'].includes(String(b.payment_method)) ? String(b.payment_method) : 'cash'
    const payment_ref = str(b.payment_ref, 120)
    if (method === 'bank' && !payment_ref) return bad('Enter the bank transfer reference.')
    if (method === 'petty_cash') {
      const bal = await pettyBalance()
      if (Number(r.claim_amount) > bal) return bad(`Petty cash has only ${lkr(bal)}. Top it up first or pay by bank.`)
    }
    const paid_on = day(b.paid_on) || today()
    const { data: claimed } = await svc().from('fin_reimbursements').update({
      status: 'paid', payment_method: method, payment_ref, paid_by: c.email, paid_name: c.name, paid_at: new Date().toISOString(), paid_on,
    }).eq('id', r.id).eq('status', 'approved').select('id').maybeSingle()
    if (!claimed) return bad('Someone else already recorded this payment. Refresh.', 409)
    const led = await postLedger(c, {
      type: 'expense', category: r.category, amount: Number(r.claim_amount), date: paid_on,
      description: `${r.rb_no}: reimbursement to ${r.claimant} for ${r.purpose}`,
      cash_or_bank: method === 'bank' ? 'bank' : 'cash', event: r.event, bill_url: r.bill_url, bill_no: r.bill_no, bank_ref: payment_ref,
    })
    if ('error' in led) {
      await svc().from('fin_reimbursements').update({ status: 'approved', payment_method: null, payment_ref: null, paid_by: null, paid_name: null, paid_at: null, paid_on: null }).eq('id', r.id)
      return bad(led.error, 500)
    }
    await svc().from('fin_reimbursements').update({ ledger_id: led.id }).eq('id', r.id)
    if (method === 'petty_cash') {
      await svc().from('fin_petty_cash').insert({
        entry_type: 'spend', amount: r.claim_amount, purpose: `${r.rb_no}: reimbursement to ${r.claimant}`, event: r.event,
        category: r.category, bill_no: r.bill_no, bill_url: r.bill_url, entry_date: paid_on, ledger_id: led.id,
        recorded_by: c.email, recorded_name: c.name,
      })
    }
    await logDoc(c, 'reimbursement', r.id, r.rb_no, 'paid_recorded', lkr(r.claim_amount))
    return ok()
  },

  // ---------------- Income receipts ----------------
  async 'ir.create'(c, b) {
    const deny = need(c, 'pay'); if (deny) return deny
    const kind = b.kind === 'in_kind' ? 'in_kind' : 'monetary'
    const source_type = str(b.source_type, 60) || 'Other'
    const row = {
      event: str(b.event, 80) || 'General', source_type, received_from: str(b.received_from, 160), kind,
      amount: kind === 'monetary' ? num(b.amount) : 0,
      in_kind_description: kind === 'in_kind' ? str(b.in_kind_description, 1000) : null,
      in_kind_value: kind === 'in_kind' ? num(b.in_kind_value) : null,
      payment_method: kind === 'monetary' ? (b.payment_method === 'cash' ? 'cash' : 'bank') : null,
      reference: str(b.reference, 120), received_on: day(b.received_on) || today(), proof_url: cleanFileUrl(b.proof_url),
      notes: str(b.notes, 1000), recorded_by: c.email, recorded_name: c.name,
    }
    if (!row.received_from) return bad('Enter who the income was received from.')
    if (kind === 'monetary' && (!row.amount || row.amount <= 0)) return bad('Enter the amount received.')
    if (kind === 'in_kind' && !row.in_kind_description) return bad('Describe what was given in kind.')
    if (kind === 'monetary' && row.payment_method === 'bank' && !row.reference) return bad('Enter the bank reference for a bank receipt.')
    const { data, error } = await svc().from('fin_income_receipts').insert(row).select('*').single()
    if (error) return dbError(error)
    if (kind === 'monetary') {
      const led = await postLedger(c, {
        type: 'income', category: FIN_INCOME_SOURCES[source_type] || 'Other Income', amount: Number(row.amount), date: row.received_on,
        description: `${data.ir_no}: ${source_type} from ${row.received_from}`, cash_or_bank: row.payment_method as 'cash' | 'bank',
        event: row.event, bill_url: row.proof_url, bill_no: data.ir_no, bank_ref: row.reference,
      })
      if ('error' in led) { await svc().from('fin_income_receipts').delete().eq('id', data.id); return bad(led.error, 500) }
      await svc().from('fin_income_receipts').update({ ledger_id: led.id }).eq('id', data.id)
    }
    await logDoc(c, 'income', data.id, data.ir_no, 'recorded', kind === 'monetary' ? lkr(row.amount) : `in kind: ${row.in_kind_description}`)
    return ok({ row: data })
  },

  // ---------------- Petty cash ----------------
  async 'pc.create'(c, b) {
    const deny = need(c, 'pay'); if (deny) return deny
    const entry_type = b.entry_type === 'top_up' ? 'top_up' : 'spend'
    const row = {
      entry_type, amount: num(b.amount), purpose: str(b.purpose, 500), event: str(b.event, 80) || 'General',
      category: entry_type === 'spend' ? (str(b.category, 80) || 'Other Expenses') : null,
      bill_no: str(b.bill_no, 80), bill_url: cleanFileUrl(b.bill_url), entry_date: day(b.entry_date) || today(),
      recorded_by: c.email, recorded_name: c.name,
    }
    if (!row.amount || row.amount <= 0 || !row.purpose) return bad('Enter the amount and what it is for.')
    if (entry_type === 'spend') {
      if (!row.bill_no || !row.bill_url) return bad('Attach the bill and enter its number for every petty cash spend.')
      const bal = await pettyBalance()
      if (row.amount > bal) return bad(`Petty cash has only ${lkr(bal)}. Record a top up first.`)
    }
    const { data, error } = await svc().from('fin_petty_cash').insert(row).select('*').single()
    if (error) return dbError(error)
    if (entry_type === 'spend') {
      const reg = await registerBill(c, row.bill_no!, 'petty_cash', data.id, data.pc_no)
      if (!reg.ok) { await svc().from('fin_petty_cash').delete().eq('id', data.id); return bad(reg.error, 409) }
      const led = await postLedger(c, {
        type: 'expense', category: row.category!, amount: row.amount, date: row.entry_date,
        description: `${data.pc_no}: petty cash, ${row.purpose}`, cash_or_bank: 'cash', event: row.event,
        bill_url: row.bill_url, bill_no: row.bill_no,
      })
      if ('error' in led) { await releaseBill(data.id); await svc().from('fin_petty_cash').delete().eq('id', data.id); return bad(led.error, 500) }
      await svc().from('fin_petty_cash').update({ ledger_id: led.id }).eq('id', data.id)
    }
    await logDoc(c, 'petty_cash', data.id, data.pc_no, entry_type, `${lkr(row.amount)} ${row.purpose}`)
    return ok({ row: data })
  },

  // ---------------- Settings ----------------
  async 'settings.update'(c, b) {
    const deny = need(c, 'settings'); if (deny) return deny
    const t = num(b.approval_threshold)
    if (!t || t < 1000) return bad('Enter a threshold of at least LKR 1,000.')
    const { error } = await svc().from('fin_settings').upsert({ id: 1, approval_threshold: t, second_approver: 'chairman', updated_by: c.email, updated_at: new Date().toISOString() })
    if (error) return dbError(error)
    await logDoc(c, 'settings', null, null, 'threshold_changed', lkr(t))
    return ok()
  },
}

async function pettyBalance(): Promise<number> {
  const { data } = await svc().from('fin_petty_cash').select('entry_type, amount').limit(10000)
  return (data ?? []).reduce((s, e) => s + (e.entry_type === 'top_up' ? 1 : -1) * Number(e.amount), 0)
}
