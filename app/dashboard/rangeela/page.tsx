'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Search, Download, X, CheckCircle2, XCircle, ExternalLink, FileText, Mail, RefreshCw,
  AlertTriangle, Ticket, Clock, Banknote, Landmark, DoorOpen, User, Phone, School, ChevronRight,
} from 'lucide-react'
import RangeelaTabs from './RangeelaTabs'
import { rgApi, fmtTime, type RgTicket, type RgMe } from '@/lib/rangeela-client'

interface Scan { id: number; ticket_id: string | null; code: string | null; result: string; scanned_by: string | null; scanned_at: string }

const isFileLink = (url?: string | null) => !!url && /\.(pdf|heic|heif)$/i.test(url.toLowerCase().split('?')[0])

const FILTERS = [
  { key: 'pending', label: 'To approve' },
  { key: 'approved', label: 'Approved' },
  { key: 'checked_in', label: 'Checked in' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
] as const

export default function RangeelaTicketsPage() {
  const [me, setMe] = useState<RgMe | null>(null)
  const [tickets, setTickets] = useState<RgTicket[]>([])
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [methodFilter, setMethodFilter] = useState('all')
  const [selected, setSelected] = useState<RgTicket | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectNotify, setRejectNotify] = useState(true)
  const [showReject, setShowReject] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [shown, setShown] = useState(30)

  useEffect(() => { load() }, [])

  // Lock page scroll while the detail sheet is open (mobile friendly).
  useEffect(() => {
    if (!selected) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [selected])

  async function load(silent = false) {
    if (silent) setRefreshing(true); else setLoading(true)
    const r = await rgApi<{ tickets: RgTicket[]; scans: Scan[]; me: RgMe; error?: string }>('tickets')
    if (r.ok) {
      setTickets(r.data.tickets)
      setScans(r.data.scans)
      setMe(r.data.me)
      setLoadError('')
    } else {
      setLoadError(r.data?.error || 'Could not load tickets.')
    }
    setLoading(false)
    setRefreshing(false)
  }

  function open(t: RgTicket) {
    setSelected(t)
    setNotice(null)
    setShowReject(false)
    setRejectReason('')
    setRejectNotify(true)
    setNewEmail(t.email)
  }

  function replace(t: RgTicket) {
    setTickets((prev) => prev.map((x) => (x.id === t.id ? t : x)))
    setSelected(t)
  }

  async function approve(t: RgTicket) {
    if (busy) return
    setBusy(true); setNotice(null)
    const r = await rgApi('approve', { id: t.id })
    setBusy(false)
    if (!r.ok) { setNotice({ kind: 'err', text: r.data?.error || 'Could not approve.' }); load(true); return }
    replace(r.data.ticket)
    setNotice(r.data.emailed
      ? { kind: 'ok', text: `Approved. The QR ticket was emailed to ${r.data.ticket.email}.` }
      : { kind: 'err', text: `Approved, but the email failed: ${r.data.emailError}. Use "Save and resend ticket" to try again.` })
  }

  async function reject(t: RgTicket) {
    if (busy) return
    if (t.status === 'approved' && !confirm('Cancel this approved ticket? Its QR code will stop working.')) return
    setBusy(true); setNotice(null)
    const r = await rgApi('reject', { id: t.id, reason: rejectReason, notify: rejectNotify })
    setBusy(false)
    if (!r.ok) { setNotice({ kind: 'err', text: r.data?.error || 'Could not reject.' }); return }
    replace(r.data.ticket)
    setShowReject(false)
    setNotice({ kind: 'ok', text: rejectNotify ? (r.data.emailed ? 'Rejected and the student was emailed.' : `Rejected, but the email failed: ${r.data.emailError}`) : 'Rejected. No email was sent.' })
  }

  async function resend(t: RgTicket) {
    if (busy) return
    setBusy(true); setNotice(null)
    const r = await rgApi('resend', { id: t.id, email: newEmail })
    setBusy(false)
    if (!r.ok) { setNotice({ kind: 'err', text: r.data?.error || 'Could not resend.' }); return }
    replace(r.data.ticket)
    setNotice(r.data.note ? { kind: 'ok', text: r.data.note }
      : r.data.emailed ? { kind: 'ok', text: `Ticket sent to ${r.data.ticket.email}.` }
        : { kind: 'err', text: `Email failed: ${r.data.emailError}` })
  }

  // ── Stats ──
  const stats = useMemo(() => {
    const approved = tickets.filter((t) => t.status === 'approved')
    const bank = approved.filter((t) => t.payment_method === 'bank')
    const cash = approved.filter((t) => t.payment_method === 'cash')
    const sum = (a: RgTicket[]) => a.reduce((s, t) => s + Number(t.amount || 0), 0)
    const cashBy: Record<string, { count: number; total: number }> = {}
    for (const t of cash) {
      const k = t.created_by || 'unknown'
      cashBy[k] = cashBy[k] || { count: 0, total: 0 }
      cashBy[k].count++
      cashBy[k].total += Number(t.amount || 0)
    }
    return {
      total: tickets.length,
      pending: tickets.filter((t) => t.status === 'pending').length,
      approved: approved.length,
      rejected: tickets.filter((t) => t.status === 'rejected').length,
      checkedIn: approved.filter((t) => t.checked_in_at).length,
      bankCount: bank.length, bankTotal: sum(bank),
      cashCount: cash.length, cashTotal: sum(cash),
      cashBy,
    }
  }, [tickets])

  const counts: Record<string, number> = {
    pending: stats.pending, approved: stats.approved, checked_in: stats.checkedIn, rejected: stats.rejected, all: stats.total,
  }

  // Possible duplicates: same email, WhatsApp or NIC on more than one live ticket
  const dupes = useMemo(() => {
    const live = tickets.filter((t) => t.status !== 'rejected')
    const count = (key: (t: RgTicket) => string) => {
      const m = new Map<string, number>()
      for (const t of live) { const k = key(t); if (k) m.set(k, (m.get(k) || 0) + 1) }
      return m
    }
    const byEmail = count((t) => t.email.toLowerCase())
    const byPhone = count((t) => t.whatsapp.replace(/\D/g, '').slice(-9))
    const byNic = count((t) => t.nic_norm)
    const flagged = new Set<string>()
    for (const t of live) {
      if ((byEmail.get(t.email.toLowerCase()) || 0) > 1 || (byPhone.get(t.whatsapp.replace(/\D/g, '').slice(-9)) || 0) > 1 || (byNic.get(t.nic_norm) || 0) > 1) flagged.add(t.id)
    }
    return flagged
  }, [tickets])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return tickets.filter((t) => {
      if (statusFilter === 'checked_in' ? !t.checked_in_at : statusFilter !== 'all' && t.status !== statusFilter) return false
      if (methodFilter !== 'all' && t.payment_method !== methodFilter) return false
      if (!s) return true
      return [t.ticket_number, t.full_name, t.email, t.whatsapp, t.school, t.nic].some((v) => (v || '').toLowerCase().includes(s))
    })
  }, [tickets, q, statusFilter, methodFilter])

  useEffect(() => { setShown(30) }, [q, statusFilter, methodFilter])

  const rows = filtered.slice(0, shown)
  const nameById = useMemo(() => new Map(tickets.map((t) => [t.id, t])), [tickets])

  function exportCSV() {
    const head = ['Ticket', 'Name', 'Email', 'WhatsApp', 'School', 'A/L batch', 'NIC', 'Method', 'Amount', 'Status', 'Approved by', 'Emailed', 'Checked in', 'Checked in by', 'Receipt', 'Submitted']
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [head.join(','), ...filtered.map((t) => [
      t.ticket_number, t.full_name, t.email, t.whatsapp, t.school, t.al_batch, t.nic, t.payment_method, t.amount, t.status,
      t.approved_by, fmtTime(t.ticket_emailed_at), fmtTime(t.checked_in_at), t.checked_in_by, t.receipt_url, fmtTime(t.created_at),
    ].map(cell).join(','))]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `rangeela26_tickets_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); a.remove()
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-t-2 border-r-2 border-[#E6007E] rounded-full animate-spin" /></div>
  }

  return (
    <div className="rg-page space-y-4">
      <RangeelaTabs me={me} subtitle="Ticket requests, payment approvals and entrance check in" />

      {loadError && (
        <div className="rg-glass flex gap-2 items-start p-4 text-red-700 text-sm"><AlertTriangle size={18} className="shrink-0" /> {loadError}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="To approve" value={stats.pending} icon={Clock} tone="#D97706" onClick={() => setStatusFilter('pending')} />
        <Stat label="Issued" value={stats.approved} icon={Ticket} tone="#16A34A" sub={`${stats.total} requests`} onClick={() => setStatusFilter('approved')} />
        <Stat label="Checked in" value={stats.checkedIn} icon={DoorOpen} tone="#7B2FF7" sub={stats.approved ? `${Math.round((stats.checkedIn / stats.approved) * 100)}% of issued` : undefined} onClick={() => setStatusFilter('checked_in')} />
        <div className="rg-glass p-4 text-white" style={{ background: 'linear-gradient(135deg, rgba(36,22,40,0.92), rgba(88,40,110,0.88))', borderColor: 'rgba(255,255,255,0.25)' }}>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/60">Ticket income</div>
          <div className="text-2xl font-extrabold mt-1.5">LKR {(stats.bankTotal + stats.cashTotal).toLocaleString()}</div>
          <div className="text-[11px] text-white/65 mt-1 space-y-0.5">
            <div className="flex items-center gap-1.5"><Landmark size={12} /> Bank {stats.bankCount} · LKR {stats.bankTotal.toLocaleString()}</div>
            <div className="flex items-center gap-1.5"><Banknote size={12} /> Cash {stats.cashCount} · LKR {stats.cashTotal.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {Object.keys(stats.cashBy).length > 0 && (
        <div className="rg-glass p-4">
          <div className="rg-label mb-2">Cash collected by account</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.cashBy).map(([k, v]) => (
              <span key={k} className="px-3 py-1.5 rounded-full bg-white/70 text-xs text-[#1B1320]"><b>{k}</b> · {v.count} · LKR {v.total.toLocaleString()}</span>
            ))}
          </div>
        </div>
      )}

      {/* Search + filters */}
      <div className="rg-glass p-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B5E68]" size={17} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ticket, phone, NIC" className="rg-input" style={{ paddingLeft: 40 }} />
          </div>
          <button onClick={() => load(true)} aria-label="Refresh" className="rg-btn rg-btn-ghost" style={{ width: 48, padding: 0 }}>
            <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {(me?.role === 'chairman' || me?.role === 'cfo') && (
            <span className="hidden sm:block">
              <button onClick={exportCSV} disabled={!filtered.length} aria-label="Export CSV" className="rg-btn rg-btn-ghost">
                <Download size={16} /> CSV
              </button>
            </span>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map((fl) => (
            <button key={fl.key} onClick={() => setStatusFilter(fl.key)}
              className={`shrink-0 h-9 px-3.5 rounded-full text-[13px] font-bold border transition-all ${statusFilter === fl.key ? 'bg-[#1B1320] text-white border-[#1B1320]' : 'bg-white/70 text-[#3A2E38] border-white'}`}>
              {fl.label} <span className={statusFilter === fl.key ? 'text-white/70' : 'text-[#9A8D97]'}>{counts[fl.key]}</span>
            </button>
          ))}
          <span className="w-px bg-[#1B1320]/10 shrink-0 mx-1" />
          {[['all', 'Bank + cash'], ['bank', 'Bank'], ['cash', 'Cash']].map(([k, l]) => (
            <button key={k} onClick={() => setMethodFilter(k)}
              className={`shrink-0 h-9 px-3.5 rounded-full text-[13px] font-bold border transition-all ${methodFilter === k ? 'bg-[#7B2FF7] text-white border-[#7B2FF7]' : 'bg-white/70 text-[#3A2E38] border-white'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket list (cards, work on any screen) */}
      <div className="rg-glass overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6B5E68]">Nothing here yet.</div>
        ) : (
          <ul className="divide-y divide-[#1B1320]/[0.06]">
            {rows.map((t) => (
              <li key={t.id}>
                <button onClick={() => open(t)} className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-white/50 active:bg-white/70 transition-colors">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-extrabold"
                    style={{ background: t.status === 'approved' ? (t.checked_in_at ? '#7B2FF7' : '#16A34A') : t.status === 'rejected' ? '#DC2626' : '#F59E0B' }}>
                    {t.full_name.trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-[15px] text-[#1B1320] truncate">{t.full_name}</span>
                      {t.payment_method === 'cash' && <Banknote size={14} className="text-[#6B5E68] shrink-0" />}
                    </div>
                    <div className="text-[12.5px] text-[#6B5E68] truncate">{t.school} · {t.al_batch}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="font-mono text-[11.5px] font-bold text-[#7B2FF7]">{t.ticket_number}</span>
                      <span className={`rg-chip ${t.status}`}>{t.status === 'pending' ? 'To approve' : t.status}</span>
                      {t.checked_in_at && <span className="rg-chip in">Checked in</span>}
                      {t.status === 'approved' && t.email_error && <span className="rg-chip rejected">Email failed</span>}
                      {dupes.has(t.id) && <span className="rg-chip warn">Duplicate?</span>}
                    </div>
                  </div>
                  <div className="hidden sm:block text-[11.5px] text-[#6B5E68] text-right shrink-0">{fmtTime(t.created_at)}</div>
                  <ChevronRight size={18} className="text-[#B3A6B0] shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {filtered.length > shown && (
          <div className="p-3 border-t border-[#1B1320]/[0.06]">
            <button onClick={() => setShown((n) => n + 30)} className="rg-btn rg-btn-ghost w-full">Show more ({filtered.length - shown} left)</button>
          </div>
        )}
      </div>

      {/* Recent gate scans */}
      {scans.length > 0 && (
        <div className="rg-glass p-4">
          <div className="rg-label mb-2">Recent gate scans</div>
          <div className="divide-y divide-[#1B1320]/[0.06]">
            {scans.slice(0, 12).map((s) => {
              const t = s.ticket_id ? nameById.get(s.ticket_id) : undefined
              const cls = s.result === 'admitted' ? 'approved' : s.result === 'already_used' ? 'rejected' : 'pending'
              return (
                <div key={s.id} className="py-2.5 flex items-center gap-3 text-[13px]">
                  <span className={`rg-chip ${cls} shrink-0`}>{s.result.replace('_', ' ')}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[#1B1320] truncate">{t ? t.full_name : s.code}</div>
                    <div className="text-[11.5px] text-[#6B5E68] truncate">{s.scanned_by} · {fmtTime(s.scanned_at)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Detail sheet: bottom sheet on phones, side panel on desktop */}
      {selected && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-stretch sm:justify-end">
          <div onClick={() => setSelected(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-none sm:h-full flex flex-col rounded-t-[28px] sm:rounded-none overflow-hidden"
            style={{ background: 'rgba(252,249,252,0.94)', WebkitBackdropFilter: 'blur(30px) saturate(180%)', backdropFilter: 'blur(30px) saturate(180%)', boxShadow: '0 -20px 60px -20px rgba(0,0,0,0.35)' }}>
            <div className="sm:hidden flex justify-center pt-2.5"><span className="w-10 h-1.5 rounded-full bg-[#1B1320]/15" /></div>
            <div className="flex items-start justify-between gap-4 px-5 pt-3 sm:pt-6 pb-3">
              <div className="min-w-0">
                <div className="font-mono text-lg font-extrabold text-[#7B2FF7]">{selected.ticket_number}</div>
                <div className="text-[12px] text-[#6B5E68]">Submitted {fmtTime(selected.created_at)}{selected.source === 'cash_desk' ? ` · cash desk` : ''}</div>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close" className="w-9 h-9 rounded-full bg-[#1B1320]/[0.06] flex items-center justify-center text-[#1B1320] shrink-0"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4" style={{ overscrollBehavior: 'contain' }}>
              <div className="flex flex-wrap gap-1.5">
                <span className={`rg-chip ${selected.status}`}>{selected.status === 'pending' ? 'Waiting for approval' : selected.status}</span>
                {selected.checked_in_at && <span className="rg-chip in">Checked in {fmtTime(selected.checked_in_at)}</span>}
                {dupes.has(selected.id) && <span className="rg-chip warn">Possible duplicate</span>}
              </div>

              {notice && (
                <div className={`flex gap-2 items-start p-3 rounded-2xl text-[13px] ${notice.kind === 'ok' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {notice.kind === 'ok' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />} {notice.text}
                </div>
              )}

              <div className="rounded-2xl bg-white/80 border border-white divide-y divide-[#1B1320]/[0.06] text-[14px]">
                <Row icon={User} label="Name" value={selected.full_name} />
                <Row icon={Mail} label="Email" value={selected.email} />
                <Row icon={Phone} label="WhatsApp" value={<a className="text-[#16A34A] font-semibold" href={`https://wa.me/${selected.whatsapp.replace(/\D/g, '').replace(/^0/, '94')}`} target="_blank" rel="noreferrer">{selected.whatsapp}</a>} />
                <Row icon={School} label="School" value={`${selected.school} · ${selected.al_batch}`} />
                <Row icon={Ticket} label="NIC" value={<span className="font-mono">{selected.nic}</span>} />
                <Row icon={selected.payment_method === 'cash' ? Banknote : Landmark} label="Payment" value={`LKR ${Number(selected.amount).toLocaleString()} · ${selected.payment_method === 'cash' ? 'Cash' : 'Bank transfer'}`} />
                {selected.approved_by && <Row icon={CheckCircle2} label="Approved" value={`${selected.approved_by} · ${fmtTime(selected.approved_at)}`} />}
                {selected.ticket_emailed_at && <Row icon={Mail} label="Emailed" value={fmtTime(selected.ticket_emailed_at)} />}
                {selected.checked_in_by && <Row icon={DoorOpen} label="Scanned by" value={selected.checked_in_by} />}
                {selected.reject_reason && <Row icon={XCircle} label="Reject note" value={selected.reject_reason} />}
                {selected.notes && <Row icon={FileText} label="Notes" value={selected.notes} />}
              </div>

              {selected.email_error && selected.status === 'approved' && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-[13px] text-red-700">Last email attempt failed: {selected.email_error}</div>
              )}

              {selected.payment_method === 'bank' && (
                <div>
                  <div className="rg-label mb-2">Bank receipt</div>
                  {selected.receipt_url ? (
                    isFileLink(selected.receipt_url) ? (
                      <a href={selected.receipt_url} target="_blank" rel="noreferrer" className="rg-btn rg-btn-ghost"><FileText size={15} /> Open receipt file <ExternalLink size={13} /></a>
                    ) : (
                      <a href={selected.receipt_url} target="_blank" rel="noreferrer" className="block">
                        <img src={selected.receipt_url} alt="Bank receipt" className="w-full max-h-[420px] object-contain rounded-2xl border border-white bg-white" />
                      </a>
                    )
                  ) : <p className="text-[13px] text-[#6B5E68]">No receipt.</p>}
                  <p className="text-[12px] text-[#6B5E68] mt-2">Check it shows LKR 1,200 paid to Sampath Bank 1069 6100 6902 before approving.</p>
                </div>
              )}

              {me?.can.edit && (
                <div className="rounded-2xl bg-white/80 border border-white p-3.5 space-y-2">
                  <div className="rg-label">Wrong email? Fix it here</div>
                  <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" autoCapitalize="off" autoCorrect="off" className="rg-input" />
                  <button onClick={() => resend(selected)} disabled={busy} className="rg-btn rg-btn-dark w-full">
                    <Mail size={15} /> {selected.status === 'approved' ? 'Save and resend ticket' : 'Save email'}
                  </button>
                </div>
              )}

              {me?.can.approve && selected.status !== 'rejected' && (selected.status === 'pending' || me.can.revoke) && !selected.checked_in_at && showReject && (
                <div className="rounded-2xl border border-red-200 bg-red-50/70 p-3.5 space-y-3">
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} maxLength={500}
                    placeholder="Short note for the student, e.g. The receipt is unclear, or the amount does not match."
                    className="w-full p-3 rounded-xl border border-[#1B1320]/10 text-[15px] text-[#1B1320] bg-white focus:outline-none" />
                  <label className="flex items-center gap-2 text-[13px] text-[#1B1320]"><input type="checkbox" className="w-4 h-4" checked={rejectNotify} onChange={(e) => setRejectNotify(e.target.checked)} /> Email the student about this</label>
                  <div className="flex gap-2">
                    <button onClick={() => reject(selected)} disabled={busy} className="rg-btn flex-1 bg-red-600 text-white">{selected.status === 'approved' ? 'Cancel ticket' : 'Reject request'}</button>
                    <button onClick={() => setShowReject(false)} className="rg-btn rg-btn-ghost">Back</button>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky action bar */}
            {me?.can.approve && !showReject && (selected.status !== 'approved' || (me.can.revoke && !selected.checked_in_at)) && (
              <div className="px-5 pt-3 border-t border-[#1B1320]/[0.06] flex gap-2" style={{ paddingBottom: 'calc(14px + env(safe-area-inset-bottom))' }}>
                {selected.status !== 'approved' && (
                  <button onClick={() => approve(selected)} disabled={busy} className="rg-btn rg-btn-green flex-1">
                    <CheckCircle2 size={17} /> {busy ? 'Working...' : 'Approve and email ticket'}
                  </button>
                )}
                {selected.status !== 'rejected' && (selected.status === 'pending' || me.can.revoke) && !selected.checked_in_at && (
                  <button onClick={() => setShowReject(true)} disabled={busy} className={`rg-btn rg-btn-danger ${selected.status === 'approved' ? 'flex-1' : ''}`}>
                    <XCircle size={17} /> {selected.status === 'approved' ? 'Cancel ticket' : 'Reject'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, icon: Icon, tone, onClick }: { label: string; value: number; sub?: string; icon: React.ElementType; tone: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="rg-glass text-left p-4 active:scale-[0.98] transition-transform">
      <div className="flex items-center justify-between gap-2">
        <span className="rg-label truncate">{label}</span>
        <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${tone}1A`, color: tone }}><Icon size={15} /></span>
      </div>
      <div className="text-3xl font-extrabold mt-1.5" style={{ color: tone }}>{value}</div>
      {sub && <div className="text-[11.5px] text-[#6B5E68] mt-0.5 truncate">{sub}</div>}
    </button>
  )
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-3.5 py-2.5">
      <Icon size={15} className="text-[#6B5E68] mt-0.5 shrink-0" />
      <span className="text-[11px] uppercase tracking-wider text-[#6B5E68] w-[76px] shrink-0 mt-0.5">{label}</span>
      <span className="text-[#1B1320] break-words min-w-0 flex-1">{value}</span>
    </div>
  )
}
