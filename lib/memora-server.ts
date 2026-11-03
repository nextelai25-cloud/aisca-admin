/**
 * MEMORA '26 server helpers for admin.aisca.lk.
 *
 * Login checks reuse the RANGEELA helpers: every API route reads the caller's
 * role from the admin_users table (server side, service role), never from
 * user_metadata, so a logged in account cannot give itself more access.
 */
export { svc, getCaller, newQrToken, normaliseId, looksLikeNic, EMAIL_RE, type Caller } from '@/lib/rangeela-server'

/** Keep in step with aisca-web-fresh/src/lib/memora.ts */
export const MM = {
  name: "MEMORA '26",
  price: 3500,
  dateShort: '15th November',
  dateLabel: 'Sunday, 15th November 2026',
  time: '4.00 PM onwards',
  venue: 'Rock House, Piliyandala',
  helpContacts: [
    { name: 'Ravinu', whatsapp: '94740558725', label: '074 055 8725' },
    { name: 'Dahamsa', whatsapp: '94769753858', label: '076 975 3858' },
  ],
  bank: 'Sampath Bank 1019 5518 9611 (A S Thewmika, Piliyandala)',
  whatsappGroup: 'https://chat.whatsapp.com/EFbOmZ1zX9wJdhlNFOoO6F',
  site: 'https://aisca.lk',
} as const

export const MM_QR_PREFIX = 'MEMORA26:'

export type MemoraAction = 'view' | 'approve' | 'cash' | 'scan' | 'revoke' | 'edit'

const ACCESS: Record<MemoraAction, string[]> = {
  view:    ['chairman', 'cfo', 'memora_oc', 'memora_cash'],
  approve: ['chairman', 'cfo', 'memora_oc', 'memora_cash'],
  edit:    ['chairman', 'cfo', 'memora_oc', 'memora_cash'],
  cash:    ['chairman', 'memora_cash'],
  scan:    ['chairman', 'memora_oc', 'memora_cash'],
  revoke:  ['chairman'],
}

export function mmCan(role: string, action: MemoraAction): boolean {
  return ACCESS[action].includes(role)
}

export function mmPermissionsFor(role: string): Record<MemoraAction, boolean> {
  return Object.fromEntries(
    (Object.keys(ACCESS) as MemoraAction[]).map((a) => [a, mmCan(role, a)])
  ) as Record<MemoraAction, boolean>
}
