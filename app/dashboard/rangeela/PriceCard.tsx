'use client'

import React, { useEffect, useState } from 'react'
import { Tag, Lock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { rgApi, fmtTime, type RgMe } from '@/lib/rangeela-client'

interface LogRow { id: number; online_price: number; gate_price: number; prev_online: number | null; prev_gate: number | null; changed_by: string | null; changed_at: string }
interface PriceData { standard: number; gate: number; updated_by: string | null; updated_at: string | null; log: LogRow[] }

const lkr = (n: number) => `LKR ${Number(n).toLocaleString('en-US')}`

// Live ticket price. Everyone on the Rangeela pages can see it; only the
// chairman can change it. A change applies at once to aisca.lk/rangeela26,
// new ticket requests, the cash desk and the emails.
export default function PriceCard({ me }: { me: RgMe }) {
  const [data, setData] = useState<PriceData | null>(null)
  const [online, setOnline] = useState('')
  const [gate, setGate] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const canEdit = !!me.can.price

  async function load() {
    const r = await rgApi<PriceData>('price')
    if (r.ok) { setData(r.data); setOnline(String(r.data.standard)); setGate(String(r.data.gate)) }
  }
  useEffect(() => { load() }, [])

  const o = Number(online), g = Number(gate)
  const valid = Number.isInteger(o) && Number.isInteger(g) && o >= 100 && g >= 100 && o <= 100000 && g <= 100000
  const changed = !!data && (o !== data.standard || g !== data.gate)

  async function save() {
    if (!data || !valid || !changed) return
    const lines = [
      o !== data.standard ? `Online: ${lkr(data.standard)} → ${lkr(o)}` : '',
      g !== data.gate ? `At the gate: ${lkr(data.gate)} → ${lkr(g)}` : '',
    ].filter(Boolean).join('\n')
    if (!confirm(`Change the RANGEELA '26 ticket price for everyone?\n\n${lines}\n\nThe website, new ticket requests and the cash desk switch straight away. Tickets already submitted keep the amount they paid.`)) return
    setBusy(true); setMsg(null)
    const r = await rgApi<{ error?: string }>('price', { standard: o, gate: g })
    setBusy(false)
    if (!r.ok) { setMsg({ ok: false, text: r.data?.error || 'Could not save the price.' }); return }
    setMsg({ ok: true, text: 'Price updated for everyone.' })
    load()
  }

  return (
    <div className="rg-glass" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Tag size={16} color="#7B2FF7" />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1B1320', flex: 1 }}>Ticket price</div>
        {!canEdit && <span className="rg-chip in"><Lock size={11} /> Chairman only</span>}
      </div>

      {!data ? (
        <div style={{ fontSize: 13, color: '#6B5E68' }}>Loading price…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Online', value: online, set: setOnline, live: data.standard },
              { label: 'At the gate', value: gate, set: setGate, live: data.gate },
            ].map((p) => (
              <div key={p.label}>
                <div className="rg-label" style={{ marginBottom: 6 }}>{p.label}</div>
                {canEdit ? (
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: 15, fontSize: 13, fontWeight: 700, color: '#6B5E68' }}>LKR</span>
                    <input className="rg-input" inputMode="numeric" value={p.value} disabled={busy}
                      onChange={(e) => p.set(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                      style={{ paddingLeft: 52, fontWeight: 700 }} aria-label={`${p.label} price in LKR`} />
                  </div>
                ) : (
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1B1320' }}>{lkr(p.live)}</div>
                )}
              </div>
            ))}
          </div>

          {canEdit && (
            <button className="rg-btn rg-btn-dark" style={{ width: '100%', marginTop: 12 }} disabled={busy || !valid || !changed} onClick={save}>
              {busy ? 'Saving…' : changed ? 'Save price for everyone' : 'No changes'}
            </button>
          )}
          {canEdit && !valid && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 8 }}>Prices must be whole numbers between 100 and 100,000.</div>}

          {msg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, marginTop: 10, color: msg.ok ? '#15803D' : '#DC2626' }}>
              {msg.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />} {msg.text}
            </div>
          )}

          <div style={{ fontSize: 12, color: '#6B5E68', marginTop: 10, lineHeight: 1.5 }}>
            {data.updated_at ? <>Last changed by {data.updated_by || 'unknown'} · {fmtTime(data.updated_at)}. </> : null}
            Tickets already submitted keep the amount they paid.
          </div>

          {canEdit && data.log.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 12, fontWeight: 700, color: '#3A2E38', cursor: 'pointer' }}>Recent changes</summary>
              <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
                {data.log.map((l) => (
                  <div key={l.id} style={{ fontSize: 12, color: '#3A2E38' }}>
                    {fmtTime(l.changed_at)} · {l.changed_by} · online {l.prev_online != null ? `${lkr(l.prev_online)} → ` : ''}{lkr(l.online_price)}, gate {l.prev_gate != null ? `${lkr(l.prev_gate)} → ` : ''}{lkr(l.gate_price)}
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}
