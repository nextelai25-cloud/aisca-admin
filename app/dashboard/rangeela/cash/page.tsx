'use client'

import React, { useEffect, useState } from 'react'
import { Banknote, CheckCircle2, AlertTriangle } from 'lucide-react'
import RangeelaTabs, { RangeelaGlassStyles } from '../RangeelaTabs'
import { rgApi, AL_BATCHES, type RgMe, type RgTicket } from '@/lib/rangeela-client'

const NIC_RE = /^(\d{9}[VX]|\d{12})$/

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
    if (!NIC_RE.test(f.nic.toUpperCase().replace(/[^A-Z0-9]/g, ''))) { setError('Enter a valid NIC number (12 digits, or 9 digits followed by V or X).'); return }
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

  if (meError) return <div className="rg-page"><RangeelaGlassStyles /><div className="rg-glass p-6 text-sm text-red-600">{meError}</div></div>
  if (me && !me.can.cash) return (
    <div className="rg-page space-y-4"><RangeelaTabs me={me} subtitle="Cash desk" />
      <div className="rg-glass p-6 text-sm text-[#6B5E68]">Only the cash desk account (and the chairman) can record cash sales.</div></div>
  )

  const input = 'rg-input'
  const label = 'rg-label block mb-1.5'

  return (
    <div className="rg-page space-y-4 max-w-2xl mx-auto">
      <RangeelaTabs me={me} subtitle="Record cash sales. The QR ticket is emailed as soon as you save." />

      <div className="grid grid-cols-2 gap-3">
        <div className="rg-glass p-4">
          <div className="rg-label">Sales on this screen</div>
          <div className="text-2xl font-extrabold text-[#1B1320] mt-1">{today.count}</div>
        </div>
        <div className="rg-glass p-4 text-white" style={{ background: 'linear-gradient(135deg, rgba(36,22,40,0.92), rgba(88,40,110,0.88))', borderColor: 'rgba(255,255,255,0.25)' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">Cash to hand over</div>
          <div className="text-2xl font-bold mt-1">LKR {today.total.toLocaleString()}</div>
        </div>
      </div>
      <p className="text-[12px] text-[#6B5E68] px-1">These counters reset when the page reloads. The full cash total per account is on the Tickets tab.</p>

      {done && (
        <div className={`p-4 rounded-[22px] border text-sm ${done.emailed ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <div className="flex items-center gap-2 font-bold"><CheckCircle2 size={18} /> Sale saved · {done.ticket.ticket_number}</div>
          <div className="mt-1">{done.ticket.full_name} · LKR {Number(done.ticket.amount).toLocaleString()}{done.ticket.checked_in_at ? ' · admitted now' : ''}</div>
          <div className="mt-1">{done.emailed ? `QR ticket emailed to ${done.ticket.email}.` : `The email failed (${done.emailError}). Open the ticket in the Tickets tab and resend it.`}</div>
        </div>
      )}

      {error && <div className="flex gap-2 items-start p-4 rounded-[22px] bg-red-50 border border-red-200 text-red-700 text-sm"><AlertTriangle size={18} className="shrink-0" /> {error}</div>}

      <form onSubmit={submit} className="rg-glass p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 text-base font-extrabold text-[#1B1320]"><Banknote size={19} /> New cash sale</div>
        <div>
          <label className={label}>Full name</label>
          <input className={input} required value={f.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="As on NIC" autoComplete="off" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Email</label>
            <input className={input} required type="email" autoCapitalize="off" autoCorrect="off" value={f.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className={label}>Email again</label>
            <input className={input} required type="email" autoCapitalize="off" autoCorrect="off" value={f.email_confirm} onChange={(e) => set('email_confirm', e.target.value)} />
          </div>
          <div>
            <label className={label}>WhatsApp number</label>
            <input className={input} required type="tel" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="07X XXX XXXX" />
          </div>
          <div>
            <label className={label}>NIC number</label>
            <input className={input} required value={f.nic} onChange={(e) => set('nic', e.target.value.toUpperCase())} autoCapitalize="characters" autoCorrect="off" placeholder="12 digits, or 9 + V/X" />
          </div>
          <div>
            <label className={label}>School</label>
            <input className={input} required value={f.school} onChange={(e) => set('school', e.target.value)} />
          </div>
          <div>
            <label className={label}>A/L batch</label>
            <select className={input} value={f.al_batch} onChange={(e) => set('al_batch', e.target.value)}>
              <option value="">Choose</option>
              {AL_BATCHES.map((b) => <option key={b} value={b}>{/^\d+$/.test(b) ? `${b} A/L batch` : b}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Cash received (LKR)</label>
            <input className={input} required type="number" inputMode="numeric" min={0} step={50} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className={label}>Note (optional)</label>
            <input className={input} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. paid at school visit" />
          </div>
        </div>
        <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/70 border border-white text-sm text-[#1B1320] cursor-pointer">
          <input type="checkbox" checked={admitNow} onChange={(e) => setAdmitNow(e.target.checked)} className="mt-0.5 w-5 h-5" />
          <span><b>Selling at the gate?</b> Tick this to admit them right now. Their QR will then show as already used.</span>
        </label>
        <button type="submit" disabled={busy} className="rg-btn rg-btn-dark w-full" style={{ height: 54, fontSize: 15 }}>
          {busy ? 'Saving...' : `Save sale and email ticket · LKR ${Number(amount || 0).toLocaleString()}`}
        </button>
      </form>
    </div>
  )
}
