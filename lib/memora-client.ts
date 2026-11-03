'use client'
/* eslint-disable @typescript-eslint/no-explicit-any -- API responses are loosely typed, as in rangeela-client */
import { supabase } from '@/lib/supabase'

// Browser helper for the MEMORA '26 admin API. Attaches the logged in
// user's access token so the server can check their role. Never throws:
// a dropped connection comes back as { ok: false, status: 0 }.
export async function mmApi<T = any>(path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/memora/${path}`, {
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
  } catch {
    return { ok: false, status: 0, data: { error: 'No connection. Check the internet and try again.' } as any }
  }
}

export interface MmTicket {
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
  sms_sent_at?: string | null
  sms_error?: string | null
  created_by: string | null
  checked_in_at: string | null
  checked_in_by: string | null
  created_at: string
}

export interface MmMe {
  email: string
  name: string
  role: string
  can: { view: boolean; approve: boolean; cash: boolean; scan: boolean; revoke: boolean; edit: boolean }
}

export const MM_PRICE = 3500
export const MM_BANK_HINT = 'Sampath Bank 1019 5518 9611 (A S Thewmika, Piliyandala)'
export const MM_AL_BATCHES = ['2025', '2026', '2027', '2028', 'Other']

export const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-LK', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' }) : ''

export const MM_GOLD = 'linear-gradient(100deg, #FFE3A1, #F2C14E 45%, #C8902E)'
