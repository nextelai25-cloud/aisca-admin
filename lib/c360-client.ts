'use client'
import { supabase } from '@/lib/supabase'
import type { Entity } from '@/lib/c360'

/** Calls /api/c360 with the signed in user's token (the server checks the role). */
export async function c360Api<T = any>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  query: { entity: Entity | 'all' | 'log' | 'import'; id?: string; task?: string },
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const { data: { session } } = await supabase.auth.getSession()
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v) as [string, string][]).toString()
  try {
    const res = await fetch(`/api/c360?${qs}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    })
    let data: any = {}
    try { data = await res.json() } catch {}
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: { error: 'Could not reach the server. Check your connection.' } as any }
  }
}
