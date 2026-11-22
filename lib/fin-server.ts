import type { NextRequest } from 'next/server'
import { svc, getCaller, type Caller } from '@/lib/rangeela-server'
import type { FinAction, FinMe } from '@/lib/fin'

export { svc }

/**
 * Finance Desk access. Roles come from admin_users (server side), never from
 * the browser. Segregation of duties: the second approver must be a
 * different person from the one who approved at CFO stage.
 */
const ACCESS: Record<FinAction, string[]> = {
  view:     ['chairman', 'cfo', 'co_secretary'],
  create:   ['chairman', 'cfo', 'co_secretary'],   // enter requisitions, quotations, reimbursement claims
  cfo:      ['chairman', 'cfo'],                   // first approval (CFO stage)
  second:   ['chairman'],                          // second approval above the threshold
  pay:      ['chairman', 'cfo'],                   // vouchers, paying, income receipts, petty cash
  settings: ['chairman'],                          // approval threshold
}

export const finCan = (role: string, a: FinAction) => ACCESS[a].includes(role)

export function finMe(c: Caller): FinMe {
  return {
    email: c.email, name: c.name, role: c.role,
    can: Object.fromEntries((Object.keys(ACCESS) as FinAction[]).map((a) => [a, finCan(c.role, a)])) as FinMe['can'],
  }
}

export async function finCaller(req: NextRequest): Promise<Caller | null> {
  const c = await getCaller(req)
  return c && finCan(c.role, 'view') ? c : null
}

/** admin_users.id of the caller (finance_ledger.recorded_by expects it). */
export async function adminId(email: string): Promise<string | null> {
  const { data } = await svc().from('admin_users').select('id').ilike('email', email.replace(/[%_]/g, (m) => '\\' + m)).maybeSingle()
  return data?.id ?? null
}

/** Only files uploaded to our own finance_attachments bucket are accepted as links. */
export function cleanFileUrl(u: unknown): string | null {
  if (typeof u !== 'string' || !u) return null
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/finance_attachments/`
  return u.startsWith(base) && u.length < 600 ? u : null
}

export const str = (v: unknown, max = 500): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim().slice(0, max)
  return t || null
}
export const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v.replace(/,/g, '')) : NaN
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}
export const day = (v: unknown): string | null =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null

export const billKey = (b: string) => b.toLowerCase().replace(/[\s\-_/#.]+/g, '')

export async function logDoc(c: Caller, doc_type: string, doc_id: string | null, doc_no: string | null, action: string, note?: string | null) {
  await svc().from('fin_doc_log').insert({ doc_type, doc_id, doc_no, action, by_email: c.email, by_name: c.name, note: note || null })
}

export async function getThreshold(): Promise<number> {
  const { data } = await svc().from('fin_settings').select('approval_threshold').eq('id', 1).maybeSingle()
  const t = Number(data?.approval_threshold)
  return t > 0 ? t : 100000
}

/** Claims a bill number once across vouchers, reimbursements and petty cash. */
export async function registerBill(c: Caller, bill_no: string, doc_type: string, doc_id: string, doc_no: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = billKey(bill_no)
  if (!key) return { ok: false, error: 'Enter the bill or receipt number.' }
  const { error } = await svc().from('fin_bill_register').insert({ bill_key: key, bill_no, doc_type, doc_id, doc_no, recorded_by: c.email })
  if (!error) return { ok: true }
  if (error.code === '23505') {
    const { data } = await svc().from('fin_bill_register').select('doc_no, doc_type, recorded_at').eq('bill_key', key).maybeSingle()
    return { ok: false, error: `Bill ${bill_no} is already recorded on ${data?.doc_no || 'another document'}. The same bill cannot be submitted twice.` }
  }
  return { ok: false, error: 'Could not record the bill number. Try again.' }
}

export async function releaseBill(doc_id: string) {
  await svc().from('fin_bill_register').delete().eq('doc_id', doc_id)
}

/** Posts a recorded document to finance_ledger (+ bill/bank refs). Returns the ledger id. */
export async function postLedger(c: Caller, e: {
  type: 'income' | 'expense'; category: string; description: string; amount: number; date: string
  cash_or_bank: 'cash' | 'bank'; event: string; bill_url?: string | null; bill_no?: string | null; bank_ref?: string | null
}): Promise<{ id: string } | { error: string }> {
  const { data, error } = await svc().from('finance_ledger').insert({
    type: e.type,
    category: e.category,
    description: e.description.slice(0, 480),
    amount: e.amount,
    date: e.date,
    cash_or_bank: e.cash_or_bank,
    fund: e.event === 'General' ? 'General Fund' : 'Event Fund',
    event_project: e.event === 'General' ? null : e.event,
    recorded_by: await adminId(c.email),
    bill_url: e.bill_url || null,
    bill_filename: e.bill_url ? (e.bill_no ? `Bill ${e.bill_no}` : 'Attachment') : null,
  }).select('id').single()
  if (error || !data) {
    console.error('[fin] ledger insert failed:', error?.message)
    return { error: 'Could not post to the finance ledger: ' + (error?.message || 'unknown error') }
  }
  if (e.bill_no || e.bank_ref) {
    await svc().from('finance_ledger_details').insert({
      ledger_entry_id: data.id, invoice_number: e.bill_no || null, bank_reference_number: e.bank_ref || null,
    })
  }
  return { id: data.id }
}
