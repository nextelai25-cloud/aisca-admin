'use client'
/**
 * Printable Finance Desk documents (A4). Each opens in a new tab and prints.
 * Layout follows common Sri Lankan practice for vouchers and receipts:
 * running serial numbers, amount in figures AND words ("Rupees ... Only"),
 * budget head, certification, approval signatures, payee acknowledgement,
 * the Rs. 25 stamp duty note for receipts above Rs. 25,000, and an official
 * "Recorded" seal on every document that has been entered in the books.
 */
import {
  lkr, fmtDate, fmtDateTime, needsSecond, STATUS_LABEL,
  type FinRequisition, type FinVoucher, type FinReimbursement, type FinIncome, type FinPetty, type FinQuotation, type FinData,
  PETTY_COLUMNS, pettyColumn,
} from '@/lib/fin'
import { FIN_LOGO } from '@/lib/fin-logo'

const ORG = 'All Island Schools Commerce Association'
const STAMP_LIMIT = 25000

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const money = (n: number | null | undefined) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ---------- amount in words (Sri Lankan style) ----------
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
function below1000(n: number): string {
  const h = Math.floor(n / 100), r = n % 100
  const t = r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? ' ' + ONES[r % 10] : '')
  return [h ? ONES[h] + ' Hundred' : '', t].filter(Boolean).join(h && t ? ' and ' : '')
}
function intWords(n: number): string {
  if (n === 0) return 'Zero'
  const parts: string[] = []
  // International system (Million), as written on Sri Lankan cheques and vouchers
  const intl: [number, string][] = [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand']]
  for (const [v, name] of intl) {
    if (n >= v) { parts.push(below1000(Math.floor(n / v)) + ' ' + name); n %= v }
  }
  if (n) parts.push(below1000(n))
  return parts.join(' ')
}
export function amountInWords(amount: number): string {
  const a = Math.round(Number(amount || 0) * 100)
  const rupees = Math.floor(a / 100), cents = a % 100
  return `Rupees ${intWords(rupees)}${cents ? ` and Cents ${intWords(cents)}` : ''} Only`
}

// ---------- building blocks ----------
function seal(date: string | null, name: string | null, low = false) {
  const d = esc(fmtDate(date) || '')
  return `<div class="seal${low ? ' low' : ''}"><svg viewBox="0 0 200 200" width="150" height="150">
    <defs><path id="sc" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"/></defs>
    <circle cx="100" cy="100" r="96" fill="none" stroke="#1B3A8C" stroke-width="3"/>
    <circle cx="100" cy="100" r="66" fill="none" stroke="#1B3A8C" stroke-width="1.5"/>
    <text font-size="15" font-weight="700" fill="#1B3A8C" letter-spacing="3"><textPath href="#sc">AISCA FINANCE * OFFICIAL RECORD *</textPath></text>
    <text x="100" y="92" text-anchor="middle" font-size="21" font-weight="800" fill="#1B3A8C" letter-spacing="2">RECORDED</text>
    <text x="100" y="114" text-anchor="middle" font-size="12" font-weight="600" fill="#1B3A8C">${d}</text>
    <line x1="58" y1="130" x2="142" y2="130" stroke="#1B3A8C" stroke-width="1"/>
    <text x="100" y="146" text-anchor="middle" font-size="10" fill="#1B3A8C">${esc((name || '').slice(0, 24))}</text>
  </svg></div>`
}

const row = (label: string, value: string) => `<tr><th>${esc(label)}</th><td>${value}</td></tr>`
const sig = (role: string, name?: string | null, when?: string | null, extra = '') =>
  `<div class="sig"><div class="line"></div><b>${esc(role)}</b><span>Name: ${esc(name || '')}</span><span>Date: ${esc(when ? fmtDate(when) : '')}</span>${extra}</div>`

const logoUrl = () => FIN_LOGO

function shell(title: string, docNo: string, body: string, opts: { sealed?: { date: string | null; name: string | null; low?: boolean }; copy?: string; landscape?: boolean } = {}) {
  return page(`${docNo} ${title}`, docBlock(title, docNo, body, logoUrl(), opts), opts.landscape)
}

function page(titleText: string, inner: string, landscape?: boolean) {
  const opts = { landscape }
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(titleText)}</title><style>
  @page { size: A4 ${opts.landscape ? 'landscape' : 'portrait'}; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11.5px; margin: 0; }
  .doc { position: relative; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 12px; }
  header img { height: 30px; }
  header .org { font-size: 10px; color: #444; margin-top: 4px; letter-spacing: .3px; }
  header .meta { text-align: right; }
  header h1 { margin: 0; font-size: 17px; letter-spacing: .5px; text-transform: uppercase; }
  header .no { font-size: 13px; font-weight: 700; margin-top: 3px; }
  .copy { position: absolute; top: -2px; left: 50%; transform: translateX(-50%); font-size: 9px; font-weight: 700; letter-spacing: 2px; border: 1px solid #111; padding: 2px 8px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .6px; margin: 14px 0 6px; border-bottom: 1px solid #bbb; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; }
  table.kv th { width: 30%; text-align: left; font-weight: 600; background: #f3f3f3; }
  table.kv th, table.kv td, table.grid th, table.grid td { border: 1px solid #999; padding: 5px 7px; vertical-align: top; }
  table.grid th { background: #f3f3f3; text-align: left; font-weight: 700; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  tr.total td { font-weight: 700; background: #f7f7f7; }
  .words { border: 1px solid #999; padding: 7px; margin-top: 6px; font-weight: 600; }
  .note { font-size: 10px; color: #444; margin-top: 6px; line-height: 1.45; }
  .cert { border: 1px dashed #777; padding: 8px; margin-top: 10px; line-height: 1.5; }
  .sigs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px 22px; margin-top: 26px; }
  .sigs.four { grid-template-columns: repeat(4, 1fr); }
  .sig .line { border-bottom: 1px solid #111; height: 34px; margin-bottom: 4px; }
  .sig b { display: block; font-size: 11px; }
  .sig span { display: block; font-size: 10px; color: #333; margin-top: 2px; }
  .stampbox { border: 1px solid #111; width: 92px; height: 92px; font-size: 9px; text-align: center; display: flex; align-items: center; justify-content: center; padding: 6px; color: #444; }
  .ack { display: flex; gap: 16px; align-items: flex-end; margin-top: 16px; border: 1px solid #999; padding: 10px; }
  .ack .txt { flex: 1; line-height: 1.6; }
  .seal { position: absolute; right: 8px; top: 64px; opacity: .9; transform: rotate(-12deg); }
  .seal.low { top: auto; bottom: 30px; right: 36%; }
  .sigs, .ack, .cert, table.kv { break-inside: avoid; }
  td.nw { white-space: nowrap; }
  .badge { display: inline-block; border: 1px solid #111; padding: 1px 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .sel { font-weight: 700; }
  footer { margin-top: 18px; border-top: 1px solid #bbb; padding-top: 5px; font-size: 9px; color: #555; display: flex; justify-content: space-between; }
  .half { min-height: 128mm; }
  .cut { border-top: 1px dashed #888; margin: 10px 0 14px; text-align: center; font-size: 9px; color: #777; }
  @media screen { body { background: #e9e9ec; } .page { background: #fff; width: ${opts.landscape ? '297mm' : '210mm'}; margin: 16px auto; padding: 14mm; box-shadow: 0 2px 12px rgba(0,0,0,.15); } .bar { text-align: center; padding: 10px; font-family: Arial; } .bar button { font-size: 14px; padding: 8px 18px; cursor: pointer; } }
  @media print { .bar { display: none; } }
  </style></head><body>
  <div class="bar"><button onclick="window.print()">Print / Save as PDF</button></div>
  <div class="page">${inner}</div>
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},350)})</script>
  </body></html>`
}

function docBlock(title: string, docNo: string, body: string, logo: string, opts: { sealed?: { date: string | null; name: string | null; low?: boolean }; copy?: string }) {
  return `<div class="doc">
    ${opts.copy ? `<div class="copy">${esc(opts.copy)}</div>` : ''}
    <header><div><img src="${logo}" alt="AISCA"><div class="org">${ORG} (AISCA) &middot; aisca.lk</div></div>
    <div class="meta"><h1>${esc(title)}</h1><div class="no">No. ${esc(docNo)}</div></div></header>
    ${opts.sealed ? seal(opts.sealed.date, opts.sealed.name, opts.sealed.low) : ''}
    ${body}
    <footer><span>Generated from AISCA Finance Desk on ${esc(fmtDateTime(new Date().toISOString()))}</span><span>Serial numbers run in sequence. Spoilt or cancelled forms are kept on file, never destroyed.</span></footer>
  </div>`
}

function open(html: string) {
  const w = window.open('', '_blank')
  if (!w) { alert('Allow pop-ups for admin.aisca.lk to print documents.'); return }
  w.document.open(); w.document.write(html); w.document.close()
}

// ---------- documents ----------
function quoteTable(q: FinQuotation[]) {
  if (!q.length) return '<p class="note">No quotations recorded.</p>'
  const low = Math.min(...q.map((x) => Number(x.amount)))
  return `<table class="grid"><tr><th>#</th><th>Vendor</th><th>Contact</th><th class="num">Quoted (LKR)</th><th>Notes</th><th>Chosen</th></tr>
  ${q.map((x, i) => `<tr class="${x.selected ? 'sel' : ''}"><td>${i + 1}</td><td>${esc(x.vendor)}${Number(x.amount) === low ? ' <span class="badge">Lowest</span>' : ''}</td><td>${esc(x.contact)}</td><td class="num">${money(x.amount)}</td><td>${esc(x.notes)}</td><td>${x.selected ? 'YES' : ''}</td></tr>`).join('')}</table>`
}

export function printRequisition(r: FinRequisition, threshold: number) {
  const big = needsSecond(r.estimated_amount, threshold)
  const body = `
  <table class="kv">
    ${row('Date raised', esc(fmtDate(r.created_at)))}
    ${row('Event / project', esc(r.event))}
    ${row('Department', esc(r.department))}
    ${row('Budget head (category)', esc(r.category))}
    ${row('Requirement', `<b>${esc(r.title)}</b>`)}
    ${row('Details and expected deliverables', esc(r.details || '').replace(/\n/g, '<br>'))}
    ${row('Quantity', esc(r.quantity ?? ''))}
    ${row('Budgeted amount (LKR)', r.budgeted_amount != null ? money(r.budgeted_amount) : 'Not budgeted')}
    ${row('Estimated cost (LKR)', `<b>${money(r.estimated_amount)}</b>`)}
    ${row('Required by', esc(fmtDate(r.needed_by)))}
    ${row('Status', `<span class="badge">${esc(STATUS_LABEL[r.status] || r.status)}</span>${r.reject_reason ? ' Reason: ' + esc(r.reject_reason) : ''}`)}
  </table>
  <div class="words">${amountInWords(r.estimated_amount)}</div>
  <h2>Quotations received (procurement comparison)</h2>
  ${quoteTable(r.quotations || [])}
  <h2>Approval</h2>
  <p class="note">Approval matrix: up to ${lkr(threshold)} the CFO approves alone. Above ${lkr(threshold)} the CFO and the Chairperson both approve.
  ${big ? '<b>This requisition is above the limit and needs both signatures.</b>' : ''} A requisition is not an authority to pay. Payment is made only on a Payment Voucher.</p>
  <div class="sigs ${big ? 'four' : ''}">
    ${sig('Requested by', r.requested_by, r.created_at)}
    ${sig('Department Head', r.head_name, r.head_signed_on)}
    ${sig(`CFO ${r.cfo_at ? '(' + (r.status === 'rejected' && !r.second_at ? 'rejected' : 'approved') + ')' : ''}`, r.cfo_name, r.cfo_at)}
    ${big ? sig(`Chairperson ${r.second_at ? '(' + (r.status === 'rejected' ? 'rejected' : 'approved') + ')' : ''}`, r.second_name, r.second_at) : ''}
  </div>`
  open(shell('Expense Requisition', r.req_no, body))
}

export function printComparison(r: FinRequisition) {
  const q = r.quotations || []
  const chosen = q.find((x) => x.selected)
  const low = q.length ? q.reduce((a, b) => (Number(b.amount) < Number(a.amount) ? b : a)) : null
  const body = `
  <table class="kv">
    ${row('Requisition', esc(`${r.req_no}: ${r.title}`))}
    ${row('Event / department', esc(`${r.event} / ${r.department}`))}
    ${row('Budget head', esc(r.category))}
    ${row('Budgeted amount (LKR)', r.budgeted_amount != null ? money(r.budgeted_amount) : 'Not budgeted')}
    ${row('Specification required', esc(r.details || r.title).replace(/\n/g, '<br>'))}
  </table>
  <h2>Quotations</h2>
  ${quoteTable(q)}
  <h2>Recommendation</h2>
  <table class="kv">
    ${row('Vendor selected', chosen ? `<b>${esc(chosen.vendor)}</b> for LKR ${money(chosen.amount)}` : 'Not selected yet')}
    ${row('Lowest quotation', low ? `${esc(low.vendor)} LKR ${money(low.amount)}` : '')}
    ${row('If the lowest was not chosen, reason', '<div style="height:42px"></div>')}
  </table>
  <p class="note">Good practice: obtain at least 2 to 3 written quotations for the same specification before choosing a supplier. ${q.length < 2 ? '<b>Fewer than 2 quotations are on file.</b>' : ''}</p>
  <div class="sigs">${sig('Prepared by')}${sig('CFO')}${sig('Chairperson (if above limit)')}</div>`
  open(shell('Procurement Comparison Sheet', r.req_no, body))
}

export function printVoucher(v: FinVoucher, r: FinRequisition, threshold: number) {
  const big = needsSecond(r.estimated_amount, threshold)
  const paid = v.status === 'paid'
  const method = v.payment_method === 'bank' ? 'Bank transfer / cheque' : v.payment_method === 'cash' ? 'Cash' : 'Petty cash'
  const body = `
  <table class="kv">
    ${row('Voucher date', esc(fmtDate(v.prepared_at)))}
    ${row('Pay to', `<b>${esc(v.payee)}</b>`)}
    ${row('Requisition ref.', esc(`${r.req_no} (approved ${fmtDate(r.second_at || r.cfo_at)})`))}
    ${row('Event / department', esc(`${r.event} / ${r.department}`))}
    ${row('Budget head (category)', esc(r.category))}
  </table>
  <h2>Particulars</h2>
  <table class="grid">
    <tr><th>Description</th><th class="num">Qty</th><th class="num">Budgeted (LKR)</th><th class="num">Approved (LKR)</th><th class="num">Actual payable (LKR)</th></tr>
    <tr><td>${esc(v.description || r.title)}</td><td class="num">${esc(v.quantity ?? '')}</td><td class="num">${v.budgeted_amount != null ? money(v.budgeted_amount) : '-'}</td><td class="num">${money(r.estimated_amount)}</td><td class="num">${money(v.actual_amount)}</td></tr>
    <tr class="total"><td colspan="4">Total payable</td><td class="num">${money(v.actual_amount)}</td></tr>
  </table>
  <div class="words">${amountInWords(v.actual_amount)}</div>
  <table class="kv" style="margin-top:8px">
    ${row('Mode of payment', esc(method))}
    ${row('Bank / cheque reference', esc(v.payment_ref || ''))}
    ${row('Supplier bill / invoice no.', esc(v.bill_no || ''))}
    ${row('Status', `<span class="badge">${esc(STATUS_LABEL[v.status])}</span>${v.void_reason ? ' ' + esc(v.void_reason) : ''}`)}
  </table>
  <div class="cert">I certify that the goods or services above were ordered against an approved requisition, have been received in good order, the amount is correct and payment is in order.</div>
  <div class="sigs ${big ? 'four' : ''}">
    ${sig('Prepared by (CFO)', v.prepared_name, v.prepared_at)}
    ${sig('Checked by')}
    ${sig('Authorised by (CFO)', r.cfo_name, r.cfo_at)}
    ${big ? sig('Authorised by (Chairperson)', r.second_name, r.second_at) : ''}
  </div>
  <div class="ack"><div class="txt"><b>Payee acknowledgement.</b> Received the sum of LKR ${money(v.actual_amount)} (${amountInWords(v.actual_amount)}) in full settlement of the above.<br><br>
  Signature: ............................................ &nbsp; Name: ............................................ &nbsp; NIC: ............................ &nbsp; Date: ................</div>
  ${Number(v.actual_amount) > STAMP_LIMIT ? '<div class="stampbox">Affix Rs. 25 stamp (receipts above Rs. 25,000)</div>' : ''}</div>
  <p class="note">Only a paid voucher with the original bill attached is entered in the financial statements.</p>`
  open(shell('Payment Voucher', v.pv_no, body, paid ? { sealed: { date: v.paid_on || v.paid_at, name: v.paid_name } } : {}))
}

export function printReimbursement(rb: FinReimbursement, threshold: number) {
  const big = needsSecond(rb.claim_amount, threshold)
  const body = `
  <table class="kv">
    ${row('Date of claim', esc(fmtDate(rb.created_at)))}
    ${row('Claimant (paid from own pocket)', `<b>${esc(rb.claimant)}</b>`)}
    ${row('Event / department', esc(`${rb.event} / ${rb.department || ''}`))}
    ${row('Budget head (category)', esc(rb.category))}
    ${row('Purpose / item', esc(rb.purpose))}
    ${row('Original bill no. and date', esc(`${rb.bill_no} ${rb.bill_date ? ' dated ' + fmtDate(rb.bill_date) : ''}`))}
  </table>
  <table class="grid" style="margin-top:8px">
    <tr><th>Bill amount (LKR)</th><th>Amount claimed (LKR)</th><th>Status</th></tr>
    <tr><td class="num">${money(rb.bill_amount)}</td><td class="num"><b>${money(rb.claim_amount)}</b></td><td><span class="badge">${esc(STATUS_LABEL[rb.status] || rb.status)}</span>${rb.reject_reason ? ' ' + esc(rb.reject_reason) : ''}</td></tr>
  </table>
  <div class="words">${amountInWords(rb.claim_amount)}</div>
  <div class="cert"><b>Claimant declaration.</b> I paid the above amount personally for AISCA work. The original bill is attached, the claim does not exceed the bill and it has not been claimed before.<br><br>Claimant signature: ..............................................</div>
  <p class="note">Conditions: original bill or receipt is mandatory; the reimbursement can never exceed the bill; CFO approval is required (plus the Chairperson above ${lkr(threshold)}); amounts, purpose and receipt number must be recorded.</p>
  <div class="sigs ${big ? 'four' : ''}">
    ${sig('Claimant', rb.claimant, rb.created_at)}
    ${sig('Department Head')}
    ${sig('Approved by (CFO)', rb.cfo_name, rb.cfo_at)}
    ${big ? sig('Approved by (Chairperson)', rb.second_name, rb.second_at) : ''}
  </div>
  <div class="ack"><div class="txt"><b>Received</b> LKR ${money(rb.claim_amount)} by ${esc(rb.payment_method ? rb.payment_method.replace('_', ' ') : '..................')} ${rb.payment_ref ? '(ref ' + esc(rb.payment_ref) + ')' : ''}.<br><br>
  Signature: ............................................ &nbsp; Date: ${esc(fmtDate(rb.paid_on) || '................')}</div>
  ${Number(rb.claim_amount) > STAMP_LIMIT ? '<div class="stampbox">Affix Rs. 25 stamp (receipts above Rs. 25,000)</div>' : ''}</div>`
  open(shell('Expense Reimbursement Form', rb.rb_no, body, rb.status === 'paid' ? { sealed: { date: rb.paid_on || rb.paid_at, name: rb.paid_name } } : {}))
}

export function printIncome(ir: FinIncome) {
  const logo = logoUrl()
  const isCash = ir.kind === 'monetary'
  const one = (copy: string) => {
    const body = isCash ? `
    <div class="cert" style="font-size:13px;line-height:2">Received with thanks from <b>${esc(ir.received_from)}</b><br>
    the sum of <b>${amountInWords(ir.amount)}</b><br>
    (LKR <b>${money(ir.amount)}</b>) by <b>${ir.payment_method === 'cash' ? 'cash' : 'bank transfer / cheque'}</b>${ir.reference ? ' ref. <b>' + esc(ir.reference) + '</b>' : ''}<br>
    being <b>${esc(ir.source_type)}</b> for <b>${esc(ir.event)}</b>${ir.notes ? ' (' + esc(ir.notes) + ')' : ''}.</div>
    <table class="kv" style="margin-top:8px">${row('Date received', esc(fmtDate(ir.received_on)))}</table>`
    : `
    <div class="cert" style="font-size:13px;line-height:2">Acknowledged with thanks from <b>${esc(ir.received_from)}</b><br>
    the following contribution in kind for <b>${esc(ir.event)}</b> (${esc(ir.source_type)}):<br>
    <b>${esc(ir.in_kind_description)}</b><br>
    Estimated value: <b>${ir.in_kind_value ? 'LKR ' + money(ir.in_kind_value) : 'not stated'}</b></div>
    <table class="kv" style="margin-top:8px">${row('Date received', esc(fmtDate(ir.received_on)))}</table>
    <p class="note">In-kind support is recorded for the event file and the sponsor's acknowledgement. No cash was received.</p>`
    const stamp = isCash && Number(ir.amount) > STAMP_LIMIT ? '<div class="stampbox">Rs. 25 stamp duty (receipts above Rs. 25,000)</div>' : ''
    return `<div class="half">${docBlock(isCash ? 'Official Receipt' : 'In-Kind Acknowledgement', ir.ir_no, `${body}
      <div class="ack"><div class="txt">${sig('Received by (for AISCA)', ir.recorded_name, ir.recorded_at)}</div>${stamp}</div>`, logo, { copy, sealed: { date: ir.recorded_at, name: ir.recorded_name } })}</div>`
  }
  open(page(`${ir.ir_no} Receipt`, `${one('ORIGINAL')}<div class="cut">cut here</div>${one('OFFICE COPY')}`))
}

/** Codes printed on petty cash vouchers and the book (AISCA petty cash chart). */
export const PETTY_ACCOUNT = { code: '1102', name: 'Petty Cash (imprest)' }
export const PETTY_CODES: Record<string, string> = {
  'Transportation': '5210', 'Food & Beverages': '5220', 'Printing & Stationery': '5230',
  'Postage & Courier': '5240', 'Communication': '5250', 'Sundry Expenses': '5290',
}

/** Petty cash voucher (one per payment), laid out like a standard Sri Lankan PCV. */
export function printPettyVoucher(p: FinPetty, float: number) {
  if (p.entry_type !== 'spend') return
  const col = pettyColumn(p.category)
  const body = `
  <table class="kv" style="width:66%">
    ${row('Date', esc(fmtDate(p.entry_date)))}
    ${row('Paid a sum of', `<b>${amountInWords(p.amount)}</b>`)}
    ${row('To', `<b>${esc(p.paid_to || '')}</b>`)}
    ${row('Petty cash account code', `${PETTY_ACCOUNT.code} &nbsp; ${PETTY_ACCOUNT.name} (float LKR ${money(float)})`)}
    ${row('Event / project', esc(p.event))}
  </table>
  <table class="grid" style="margin-top:34px">
    <tr><th>Account code</th><th>Name of the account</th><th>Description of the payment</th><th class="num">Amount (Rs. Cts)</th></tr>
    <tr><td>${PETTY_CODES[col]}</td><td>${esc(col)}</td><td>${esc(p.purpose)}</td><td class="num">${money(p.amount)}</td></tr>
    <tr class="total"><td colspan="3">Total</td><td class="num">Rs ${money(p.amount)}</td></tr>
  </table>
  <table class="kv" style="margin-top:8px">
    ${row('Supporting bill', p.bill_no ? `Bill no. ${esc(p.bill_no)} attached` : '<b>No bill.</b> The receiver signs below to confirm the payment.')}
  </table>
  <div class="sigs">
    ${sig('Prepared by', p.recorded_name, p.entry_date)}
    ${sig('Authorised by (CFO)')}
    ${sig('Received by', p.paid_to, null, '<span>NIC: ..............................</span>')}
  </div>`
  open(shell('Petty Cash Voucher', p.pc_no, body, { sealed: { date: p.entry_date, name: p.recorded_name } }))
}

/** Analytical petty cash book on the imprest system. */
export function printPettyBook(rows: FinPetty[], float: number, from?: string, to?: string) {
  const cols = PETTY_COLUMNS
  let bal = 0, opening = 0, recd = 0, paid = 0
  const tot: Record<string, number> = Object.fromEntries(cols.map((c) => [c, 0]))
  const lines: string[] = []
  for (const p of rows) {
    const amt = Number(p.amount) * (p.entry_type === 'top_up' ? 1 : -1)
    if (from && p.entry_date < from) { opening += amt; bal += amt; continue }
    if (to && p.entry_date > to) continue
    bal += amt
    const col = pettyColumn(p.category)
    if (p.entry_type === 'top_up') recd += Number(p.amount)
    else { paid += Number(p.amount); tot[col] += Number(p.amount) }
    lines.push(`<tr>
      <td class="num">${p.entry_type === 'top_up' ? money(p.amount) : ''}</td>
      <td class="nw">${esc(fmtDate(p.entry_date))}</td><td class="nw">${esc(p.pc_no)}</td>
      <td>${esc(p.entry_type === 'top_up' ? `${p.purpose}${p.reference ? ', ref ' + p.reference : ''}` : `${p.paid_to ? p.paid_to + ': ' : ''}${p.purpose}`)}${p.bill_no ? `<br><small>Bill ${esc(p.bill_no)}</small>` : ''}</td>
      <td class="num">${p.entry_type === 'spend' ? money(p.amount) : ''}</td>
      ${cols.map((c) => `<td class="num">${p.entry_type === 'spend' && col === c ? money(p.amount) : ''}</td>`).join('')}
      <td class="num">${money(bal)}</td></tr>`)
  }
  const restore = Math.max(0, float - bal)
  const body = `
  <p>Imprest float: <b>LKR ${money(float)}</b> &nbsp; Account ${PETTY_ACCOUNT.code} &nbsp; Period: ${esc(from ? fmtDate(from) : 'start')} to ${esc(to ? fmtDate(to) : fmtDate(new Date().toISOString()))}</p>
  <table class="grid" style="font-size:9.5px">
    <tr><th class="num">Receipts</th><th>Date</th><th>PCV no.</th><th style="width:24%">Particulars</th><th class="num">Total paid</th>
      ${cols.map((c) => `<th class="num">${esc(c)}<br><small>${PETTY_CODES[c]}</small></th>`).join('')}<th class="num">Balance</th></tr>
    <tr><td class="num">${money(opening)}</td><td></td><td></td><td><b>Balance b/d</b></td><td></td>${cols.map(() => '<td></td>').join('')}<td class="num">${money(opening)}</td></tr>
    ${lines.join('')}
    <tr class="total"><td class="num">${money(opening + recd)}</td><td colspan="3">Totals for the period</td><td class="num">${money(paid)}</td>${cols.map((c) => `<td class="num">${money(tot[c])}</td>`).join('')}<td></td></tr>
    <tr><td></td><td colspan="3"><b>Balance c/d</b></td><td class="num">${money(bal)}</td>${cols.map(() => '<td></td>').join('')}<td></td></tr>
    <tr class="total"><td class="num">${money(opening + recd)}</td><td colspan="3"></td><td class="num">${money(paid + bal)}</td>${cols.map(() => '<td></td>').join('')}<td></td></tr>
  </table>
  <table class="kv" style="margin-top:10px;width:60%">
    ${row('Cash in hand per book (balance c/d)', `LKR ${money(bal)}`)}
    ${row('Cash counted in the box', '')}
    ${row('Difference (explain in writing)', '')}
    ${row('Amount to restore the float', `<b>LKR ${money(restore)}</b> (equals the total paid since the last restoration)`)}
  </table>
  <p class="note">Imprest system: the box starts with a fixed float. Each payment needs a petty cash voucher. At the end of the period the float is restored by drawing exactly the amount spent, and the analysis column totals are posted to their expense accounts.</p>
  <div class="sigs" style="margin-top:14px">${sig('Petty cash custodian')}${sig('Cash counted and verified by (CFO)')}${sig('Chairperson')}</div>`
  open(shell('Petty Cash Book', 'PCB', body, { landscape: true }))
}

// ---------- event summary and final statement ----------
export interface EventTotals {
  event: string; income: number; inKind: number; expenses: number; budget: number
  incomeBySource: Record<string, number>; expByCat: Record<string, { budget: number; actual: number }>
  docs: { no: string; type: string; party: string; amount: number; date: string | null }[]
  inKindList: FinIncome[]
}

export function eventTotals(d: FinData, event: string): EventTotals {
  const t: EventTotals = { event, income: 0, inKind: 0, expenses: 0, budget: 0, incomeBySource: {}, expByCat: {}, docs: [], inKindList: [] }
  const cat = (c: string) => (t.expByCat[c] ||= { budget: 0, actual: 0 })
  const reqById = new Map(d.requisitions.map((r) => [r.id, r]))
  for (const r of d.requisitions) if (r.event === event && r.status === 'approved' && r.budgeted_amount) { cat(r.category).budget += Number(r.budgeted_amount); t.budget += Number(r.budgeted_amount) }
  const ledgerIds = new Set<string>()
  for (const v of d.vouchers) {
    const r = reqById.get(v.requisition_id)
    if (!r || r.event !== event || v.status !== 'paid') continue
    cat(r.category).actual += Number(v.actual_amount); t.expenses += Number(v.actual_amount)
    if (v.ledger_id) ledgerIds.add(v.ledger_id)
    t.docs.push({ no: v.pv_no, type: 'Payment voucher', party: v.payee, amount: Number(v.actual_amount), date: v.paid_on })
  }
  for (const rb of d.reimbursements) {
    if (rb.event !== event || rb.status !== 'paid') continue
    cat(rb.category).actual += Number(rb.claim_amount); t.expenses += Number(rb.claim_amount)
    if (rb.ledger_id) ledgerIds.add(rb.ledger_id)
    t.docs.push({ no: rb.rb_no, type: 'Reimbursement', party: rb.claimant, amount: Number(rb.claim_amount), date: rb.paid_on })
  }
  for (const p of d.petty) {
    if (p.event !== event || p.entry_type !== 'spend' || (p.ledger_id && ledgerIds.has(p.ledger_id))) continue
    cat(p.category || 'Other Expenses').actual += Number(p.amount); t.expenses += Number(p.amount)
    t.docs.push({ no: p.pc_no, type: 'Petty cash', party: p.purpose, amount: Number(p.amount), date: p.entry_date })
  }
  for (const i of d.income) {
    if (i.event !== event) continue
    if (i.kind === 'monetary') {
      t.income += Number(i.amount); t.incomeBySource[i.source_type] = (t.incomeBySource[i.source_type] || 0) + Number(i.amount)
      t.docs.push({ no: i.ir_no, type: 'Income receipt', party: i.received_from, amount: Number(i.amount), date: i.received_on })
    } else { t.inKind += Number(i.in_kind_value || 0); t.inKindList.push(i) }
  }
  t.docs.sort((a, b) => String(a.date).localeCompare(String(b.date)))
  return t
}

export function printEventSummary(d: FinData, event: string) {
  const t = eventTotals(d, event)
  const net = t.income - t.expenses
  const body = `
  <table class="kv">${row('Event / project', `<b>${esc(event)}</b>`)}${row('Prepared on', esc(fmtDate(new Date().toISOString())))}</table>
  <h2>Income</h2>
  <table class="grid"><tr><th>Source</th><th class="num">LKR</th></tr>
    ${Object.entries(t.incomeBySource).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${money(v)}</td></tr>`).join('') || '<tr><td colspan="2">No income recorded</td></tr>'}
    <tr class="total"><td>Total income</td><td class="num">${money(t.income)}</td></tr></table>
  <h2>Expenditure against budget</h2>
  <table class="grid"><tr><th>Budget head</th><th class="num">Budget (LKR)</th><th class="num">Actual (LKR)</th><th class="num">Variance (LKR)</th></tr>
    ${Object.entries(t.expByCat).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${money(v.budget)}</td><td class="num">${money(v.actual)}</td><td class="num">${money(v.budget - v.actual)}</td></tr>`).join('') || '<tr><td colspan="4">No expenditure recorded</td></tr>'}
    <tr class="total"><td>Total</td><td class="num">${money(t.budget)}</td><td class="num">${money(t.expenses)}</td><td class="num">${money(t.budget - t.expenses)}</td></tr></table>
  <h2>Result</h2>
  <table class="kv">${row(net >= 0 ? 'Surplus for the event' : 'Deficit for the event', `<b>LKR ${money(Math.abs(net))}</b>`)}
  ${row('In-kind support received (not included above)', `LKR ${money(t.inKind)}`)}</table>
  ${t.inKindList.length ? `<h2>In-kind support</h2><table class="grid"><tr><th>Receipt</th><th>From</th><th>Description</th><th class="num">Est. value</th></tr>${t.inKindList.map((i) => `<tr><td>${esc(i.ir_no)}</td><td>${esc(i.received_from)}</td><td>${esc(i.in_kind_description)}</td><td class="num">${money(i.in_kind_value)}</td></tr>`).join('')}</table>` : ''}
  <h2>Document register</h2>
  <table class="grid"><tr><th>Date</th><th>No.</th><th>Type</th><th>Party / particulars</th><th class="num">LKR</th></tr>
    ${t.docs.map((x) => `<tr><td>${esc(fmtDate(x.date))}</td><td>${esc(x.no)}</td><td>${esc(x.type)}</td><td>${esc(x.party)}</td><td class="num">${money(x.amount)}</td></tr>`).join('') || '<tr><td colspan="5">None</td></tr>'}</table>
  <p class="note">Income for this event only. Income and expenses of other events are kept in their own summaries and are not mixed in.</p>
  <div class="sigs">${sig('Prepared by (CFO)')}${sig('Checked by')}${sig('Approved by (Chairperson)')}</div>`
  open(shell('Event Financial Summary', event.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, ''), body))
}

export function printFinalStatement(d: FinData, events: string[]) {
  const rows = events.map((e) => eventTotals(d, e)).filter((t) => t.income || t.expenses || t.inKind)
  const tot = rows.reduce((a, t) => ({ i: a.i + t.income, e: a.e + t.expenses, k: a.k + t.inKind, b: a.b + t.budget }), { i: 0, e: 0, k: 0, b: 0 })
  const body = `
  <p>Compiled from the individual event financial summaries in the AISCA Finance Desk.</p>
  <table class="grid"><tr><th>Event / project</th><th class="num">Income</th><th class="num">Budget</th><th class="num">Expenditure</th><th class="num">Surplus / (deficit)</th><th class="num">In-kind</th></tr>
  ${rows.map((t) => `<tr><td>${esc(t.event)}</td><td class="num">${money(t.income)}</td><td class="num">${money(t.budget)}</td><td class="num">${money(t.expenses)}</td><td class="num">${t.income - t.expenses < 0 ? '(' + money(t.expenses - t.income) + ')' : money(t.income - t.expenses)}</td><td class="num">${money(t.inKind)}</td></tr>`).join('') || '<tr><td colspan="6">No records yet</td></tr>'}
  <tr class="total"><td>Total</td><td class="num">${money(tot.i)}</td><td class="num">${money(tot.b)}</td><td class="num">${money(tot.e)}</td><td class="num">${tot.i - tot.e < 0 ? '(' + money(tot.e - tot.i) + ')' : money(tot.i - tot.e)}</td><td class="num">${money(tot.k)}</td></tr></table>
  <p class="note">This is the management summary of documented income and expenditure. The formal statements (financial position, activities, cash flows) are produced from the ledger under Finance &gt; Reports.</p>
  <div class="sigs">${sig('Prepared by (CFO)')}${sig('Reviewed by')}${sig('Approved by (Chairperson)')}</div>`
  open(shell('Financial Statement Summary', `FS-${new Date().getFullYear()}`, body, { landscape: true }))
}
