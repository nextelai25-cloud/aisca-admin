'use client'
import { supabase } from '@/lib/supabase'

// Browser helper for the RANGEELA '26 admin API. Attaches the logged in
// user's access token so the server can check their role.
export async function rgApi<T = any>(path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`/api/rangeela/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  })
  let data: any = {}
  try { data = await res.json() } catch {}
  return { ok: res.ok, status: res.status, data }
}

export interface RgTicket {
  id: string
  ticket_number: string
  full_name: string
  email: string
  whatsapp: string
  school: string
  al_batch: string
  nic: string
  nic_norm: string
  payment_method: 'bank' | 'cash'
  amount: number
  receipt_url: string | null
  receipt_filename: string | null
  source: 'online' | 'cash_desk'
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  reject_reason: string | null
  approved_by: string | null
  approved_at: string | null
  ticket_emailed_at: string | null
  email_error: string | null
  created_by: string | null
  checked_in_at: string | null
  checked_in_by: string | null
  created_at: string
}

export interface RgMe {
  email: string
  name: string
  role: string
  can: { view: boolean; approve: boolean; cash: boolean; scan: boolean; revoke: boolean; edit: boolean }
}

export const AL_BATCHES = ['2026', '2027', '2028', '2029', 'Already finished A/Ls', 'Not a student']

export const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-LK', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' }) : ''

export const RAINBOW = 'linear-gradient(90deg, #E6007E, #FF4D2E, #FF7A00, #FFC300, #0FB5AE, #2F6BFF, #7B2FF7)'
