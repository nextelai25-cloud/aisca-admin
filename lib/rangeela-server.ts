import { randomBytes } from 'crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

/**
 * RANGEELA '26 server helpers for admin.aisca.lk.
 *
 * Every Rangeela API route checks the caller's role from the admin_users
 * table (server side, service role), never from user_metadata, so a
 * logged in account cannot give itself more access.
 */

let _svc: SupabaseClient | null = null
export function svc(): SupabaseClient {
  if (!_svc) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase service role env vars are missing')
    _svc = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return _svc
}

export type RangeelaAction = 'view' | 'approve' | 'cash' | 'scan' | 'revoke' | 'edit'

const ACCESS: Record<RangeelaAction, string[]> = {
  view:    ['chairman', 'cfo', 'rangeela_oc', 'rangeela_cash'],
  approve: ['chairman', 'cfo', 'rangeela_oc', 'rangeela_cash'],
  edit:    ['chairman', 'cfo', 'rangeela_oc', 'rangeela_cash'],
  cash:    ['chairman', 'rangeela_cash'],
  scan:    ['chairman', 'rangeela_oc', 'rangeela_cash'],
  revoke:  ['chairman'],
}

export function can(role: string, action: RangeelaAction): boolean {
  return ACCESS[action].includes(role)
}

export function permissionsFor(role: string): Record<RangeelaAction, boolean> {
  return Object.fromEntries(
    (Object.keys(ACCESS) as RangeelaAction[]).map((a) => [a, can(role, a)])
  ) as Record<RangeelaAction, boolean>
}

export interface Caller { email: string; name: string; role: string }

/** Reads the Bearer token, verifies it with Supabase Auth, then loads the role from admin_users. */
export async function getCaller(req: NextRequest): Promise<Caller | null> {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return null
  const { data: { user }, error } = await svc().auth.getUser(token)
  if (error || !user?.email) return null
  const email = user.email.toLowerCase()
  const { data: row } = await svc()
    .from('admin_users')
    .select('email, name, role')
    .ilike('email', email.replace(/[%_]/g, (m) => '\\' + m))
    .maybeSingle()
  if (!row) return null
  return { email, name: row.name || email, role: row.role }
}

export function newQrToken(): string {
  return randomBytes(16).toString('hex') // 32 hex chars
}

export const QR_PREFIX = 'RANGEELA26:'

export function normaliseId(v: string): string {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, '')
}
export function looksLikeNic(v: string): boolean {
  const n = normaliseId(v)
  return /^\d{9}[VX]$/.test(n) || /^\d{12}$/.test(n)
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
