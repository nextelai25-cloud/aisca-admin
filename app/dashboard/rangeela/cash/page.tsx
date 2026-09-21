'use client'

import React, { useEffect, useState } from 'react'
import { Banknote, CheckCircle2, AlertTriangle } from 'lucide-react'
import RangeelaTabs from '../RangeelaTabs'
import { rgApi, AL_BATCHES, type RgMe, type RgTicket } from '@/lib/rangeela-client'

const empty = { full_name: '', email: '', email_confirm: '', whatsapp: '', school: '', al_batch: '', nic: '', notes: '' }

export default function CashDeskPage() {
  const [me, setMe] = useState<RgMe | null>(null)
  const [meError, setMeError] = useState('')
  const [f, setF] = useState({ ...empty })
  const [amount, setAmount] = useState('1200')
  const [admitNow, setAdmitNow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ ticket: RgTicket; emailed: boolean; emailError: string | null } | null>(null)
  const [today, setToday] = useState<{ count: number; total: number }>({ count: 0, total: 0 })

  useEffect(() => {
    rgApi<{ me: RgMe; error?: string }>('me').then((r) => (r.ok ? setMe(r.data.me) : setMeError(r.data?.error || 'Not allowed')))
  }, [])

  const set = (k: keyof typeof empty, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (f.email.trim().toLowerCase() !== f.email_confirm.trim().toLowerCase()) { setError('The two emails do not match. Read the email back to the student.'); return }
    if (!f.al_batch) { setError('Choose the A/L batch.'); return }
    if (!confirm(`Record a cash sale of LKR ${Number(amount).toLocaleString()} for ${f.full_name || 'this student'}? The QR ticket will be emailed straight away.`)) return
    setBusy(true)
    const r = await rgApi<{ ticket: RgTicket; emailed: boolean; emailError: string | null; error?: string }>('cash', {
      ...f, amount: Number(amount), admit_now: admitNow,
    })
    setBusy(false)
    if (!r.ok) { setError(r.data?.error || 'Could not save the sale.'); return }
    setDone(r.data)
    setToday((t) => ({ count: t.count + 1, total: t.total + Number(r.data.ticket.amount) }))
    setF({ ...empty })
    setAmount('1200')
    setAdmitNow(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (meError) return <div className="p-6 rounded-2xl bg-white border border-[#E8E8E8] text-sm text-red-600">{meError}</div>
  if (me && !me.can.cash) return (
    <div className="space-y-6"><RangeelaTabs me={me} subtitle="Cash desk" />
      <div className="p-6 rounded-2xl bg-white border border-[#E8E8E8] text-sm text-[#6B6B6B]">Only the cash desk account (and the chairman) can record cash sales.</div></div>
  )

  const input = 'w-full px-4 py-3 rounded-xl border border-[#E8E8E8] bg-white text-base text-[#111] focus:outline-none focus:border-[#7B2FF7]'
  const label = 'block text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] mb-1.5'

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <RangeelaTabs me={me} subtitle="Record cash sales. The QR ticket is emailed as soon as you save." />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white border border-[#E8E8E8] p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">Sales on this screen</div>
          <div className="text-2xl font-bold text-[#111] mt-1">{today.count}</div>
        </div>
        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #2B1B2E, #4A2A55)' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">Cash to hand over</div>
          <div className="text-2xl font-bold mt-1">LKR {today.total.toLocaleString()}</div>
        </div>
      </div>
      <p className="text-[11px] text-[#6B6B6B] -mt-2">These counters reset when the page reloads. The full cash total per account is on the Tickets tab.</p>

      {done && (
        <div className={`p-4 rounded-2xl border text-sm ${done.emailed ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <div className="flex items-center gap-2 font-bold"><CheckCircle2 size={18} /> Sale saved · {done.ticket.ticket_number}</div>
          <div className="mt-1">{done.ticket.full_name} · LKR {Number(done.ticket.amount).toLocaleString()}{done.ticket.checked_in_at ? ' · admitted now' : ''}</div>
          <div className="mt-1">{done.emailed ? `QR ticket emailed to ${done.ticket.email}.` : `The email failed (${done.emailError}). Open the ticket in the Tickets tab and resend it.`}</div>
        </div>
      )}

      {error && <div className="flex gap-2 items-start p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm"><AlertTriangle size={18} className="shrink-0" /> {error}</div>}

      <form onSubmit={submit} className="rounded-2xl bg-white border border-[#E8E8E8] p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#111]"><Banknote size={18} /> New cash sale</div>
        <div>
          <label className={label}>Full name</label>
          <input className={input} required value={f.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="As on NIC or school ID" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Email</label>
            <input className={input} required type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className={label}>Email again</label>
            <input className={input} required type="email" value={f.email_confirm} onChange={(e) => set('email_confirm', e.target.value)} />
          </div>
          <div>
            <label className={label}>WhatsApp number</label>
            <input className={input} required type="tel" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="07X XXX XXXX" />
          </div>
          <div>
            <label className={label}>NIC or school ID</label>
            <input className={input} required value={f.nic} onChange={(e) => set('nic', e.target.value)} />
          </div>
          <div>
            <label className={label}>School</label>
            <input className={input} required value={f.school} onChange={(e) => set('school', e.target.value)} />
          </div>
          <div>
            <label className={label}>A/L batch</label>
            <select className={input} value={f.al_batch} onChange={(e) => set('al_batch', e.target.value)}>
              <option value="">Choose</option>
              {AL_BATCHES.map((b) => <option key={b} value={b}>{/^\d+$/.test(b) ? `${b} A/L` : b}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Cash received (LKR)</label>
            <input className={input} required type="number" min={0} step={50} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className={label}>Note (optional)</label>
            <input className={input} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. paid at school visit" />
          </div>
        </div>
        <label className="flex items-start gap-3 p-3 rounded-xl bg-[#F5F5F5] text-sm text-[#111] cursor-pointer">
          <input type="checkbox" checked={admitNow} onChange={(e) => setAdmitNow(e.target.checked)} className="mt-1" />
          <span><b>Selling at the gate?</b> Tick this to admit them right now. Their QR will then show as already used.</span>
        </label>
        <button type="submit" disabled={busy} className="w-full px-4 py-3.5 rounded-xl bg-[#111] text-white text-sm font-bold disabled:opacity-50">
          {busy ? 'Saving...' : `Save sale and email ticket · LKR ${Number(amount || 0).toLocaleString()}`}
        </button>
      </form>
    </div>
  )
}
