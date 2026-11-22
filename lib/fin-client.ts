'use client'
/* eslint-disable @typescript-eslint/no-explicit-any -- API responses are loosely typed, as in memora-client */
import { supabase } from '@/lib/supabase'

/** Calls /api/fin with the signed in user's token. Never throws. */
export async function finApi<T = any>(body?: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/fin', {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })
    let data: any = {}
    try { data = await res.json() } catch {}
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: { error: 'No connection. Check the internet and try again.' } as any }
  }
}

/** Uploads a bill / form scan to the finance_attachments bucket and returns its public link. */
export async function uploadFinFile(file: File): Promise<{ url?: string; error?: string }> {
  if (file.size > 10 * 1024 * 1024) return { error: 'File is larger than 10 MB.' }
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5)
  const path = `desk/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`
  const { error } = await supabase.storage.from('finance_attachments').upload(path, file, { contentType: file.type || undefined })
  if (error) return { error: 'Upload failed: ' + error.message }
  return { url: supabase.storage.from('finance_attachments').getPublicUrl(path).data.publicUrl }
}
