/**
 * Finance Desk shared types and lists (safe on client and server).
 * Process: Budget -> Requisition (dept head signs) -> CFO approves
 * (+ Chairperson above the threshold) -> quotations compared -> Payment Voucher
 * -> paid and recorded (posted to finance_ledger, bill sealed as Recorded).
 */

export type ReqStatus = 'pending_cfo' | 'pending_second' | 'approved' | 'rejected' | 'cancelled'
export type RbStatus = 'pending_cfo' | 'pending_second' | 'approved' | 'paid' | 'rejected'
export type PayMethod = 'bank' | 'cash' | 'petty_cash'

export interface FinSettings {
  id: number; approval_threshold: number; second_approver: string; updated_by: string | null; updated_at: string | null
  petty_float?: number | null; petty_max_spend?: number | null
}

export interface FinQuotation {
  id: string; requisition_id: string; vendor: string; amount: number; contact: string | null
  notes: string | null; file_url: string | null; selected: boolean; created_by: string | null; created_at: string
}

export interface FinRequisition {
  id: string; req_no: string; event: string; department: string; category: string; title: string
  details: string | null; quantity: number | null; budgeted_amount: number | null; estimated_amount: number
  needed_by: string | null; requested_by: string; head_name: string; head_signed_on: string | null; form_url: string | null
  status: ReqStatus
  cfo_by: string | null; cfo_name: string | null; cfo_at: string | null; cfo_note: string | null
  second_by: string | null; second_name: string | null; second_at: string | null; second_note: string | null
  reject_reason: string | null; created_by: string | null; created_at: string
  quotations?: FinQuotation[]
}

export interface FinVoucher {
  id: string; pv_no: string; requisition_id: string; quotation_id: string | null; payee: string; description: string | null
  quantity: number | null; budgeted_amount: number | null; actual_amount: number; payment_method: PayMethod
  payment_ref: string | null; bill_no: string | null; bill_url: string | null; status: 'authorised' | 'paid' | 'void'
  prepared_by: string | null; prepared_name: string | null; prepared_at: string | null
  paid_by: string | null; paid_name: string | null; paid_at: string | null; paid_on: string | null
  ledger_id: string | null; void_reason: string | null; created_at: string
}

export interface FinReimbursement {
  id: string; rb_no: string; event: string; department: string | null; category: string; claimant: string; purpose: string
  bill_no: string; bill_date: string | null; bill_amount: number; claim_amount: number; bill_url: string
  status: RbStatus
  cfo_by: string | null; cfo_name: string | null; cfo_at: string | null
  second_by: string | null; second_name: string | null; second_at: string | null
  reject_reason: string | null; payment_method: PayMethod | null; payment_ref: string | null
  paid_by: string | null; paid_name: string | null; paid_at: string | null; paid_on: string | null
  ledger_id: string | null; created_by: string | null; created_at: string
}

export interface FinIncome {
  id: string; ir_no: string; event: string; source_type: string; received_from: string; kind: 'monetary' | 'in_kind'
  amount: number; in_kind_description: string | null; in_kind_value: number | null; payment_method: 'bank' | 'cash' | null
  reference: string | null; received_on: string; proof_url: string | null; notes: string | null; ledger_id: string | null
  recorded_by: string | null; recorded_name: string | null; recorded_at: string | null
}

export interface FinPetty {
  id: string; pc_no: string; entry_type: 'top_up' | 'spend'; amount: number; purpose: string; event: string
  paid_to?: string | null; reference?: string | null
  category: string | null; bill_no: string | null; bill_url: string | null; entry_date: string; ledger_id: string | null
  voucher_id: string | null; recorded_by: string | null; recorded_name: string | null; created_at: string
}

export interface FinLog { id: number; doc_type: string; doc_id: string | null; doc_no: string | null; action: string; by_email: string | null; by_name: string | null; note: string | null; at: string }

export type FinAction = 'view' | 'create' | 'cfo' | 'second' | 'pay' | 'settings'
export interface FinMe { email: string; name: string; role: string; can: Record<FinAction, boolean> }

export interface FinData {
  settings: FinSettings
  requisitions: FinRequisition[]
  vouchers: FinVoucher[]
  reimbursements: FinReimbursement[]
  income: FinIncome[]
  petty: FinPetty[]
  log: FinLog[]
  me: FinMe
}

// Finance is kept event by event. General = organisation-wide costs and income not tied to one event.
export const FIN_EVENTS = ['COMMERCE 360', 'General']
export const FIN_DEFAULT_EVENT = 'COMMERCE 360'
export const FIN_DEPARTMENTS = ['Executive Authority', 'Marketing', 'Finance', 'Administration', 'Human Resources', 'Operations', 'Public Relations', 'Events']
export const FIN_EXPENSE_CATEGORIES = [
  'Photography & Videography', 'Venue Hire', 'Food & Beverages', 'Transportation', 'Printing & Stationery',
  'Marketing & Promotions', 'Awards & Trophies', 'Sound, Lighting & Stage', 'Equipment & Supplies',
  'Bank Charges', 'Charity & CSR', 'Other Expenses',
]
// Petty cash analysis columns (imprest book). Each is also the ledger expense category.
export const PETTY_COLUMNS = ['Transportation', 'Food & Beverages', 'Printing & Stationery', 'Postage & Courier', 'Communication', 'Sundry Expenses']
/** Which analysis column a petty cash payment falls under. */
export const pettyColumn = (category: string | null | undefined) =>
  category && PETTY_COLUMNS.includes(category) ? category : 'Sundry Expenses'
export const PETTY_DEFAULT_FLOAT = 10000
export const PETTY_DEFAULT_MAX = 5000

// Income source -> finance_ledger income category
export const FIN_INCOME_SOURCES: Record<string, string> = {
  'Sponsorship': 'Sponsorship',
  'Ticket sales': 'Event Registration Fees',
  'Registration fees': 'Event Registration Fees',
  'Membership fees': 'Membership Fees',
  'Merchandise': 'Product Sales',
  'Donation': 'Donations',
  'Grant': 'Grants',
  'Other': 'Other Income',
}

export const needsSecond = (amount: number, threshold: number) => Number(amount) > Number(threshold)

export const lkr = (n: number | null | undefined) =>
  `LKR ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? iso + 'T00:00:00+05:30' : iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', day: '2-digit', month: 'short', year: 'numeric' }) : ''

export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Colombo', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

export const STATUS_LABEL: Record<string, string> = {
  pending_cfo: 'Waiting for CFO',
  pending_second: 'Waiting for Chairperson',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  authorised: 'Authorised',
  paid: 'Paid & recorded',
  void: 'Void',
}
