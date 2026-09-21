'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Search, Download, X, CheckCircle2, XCircle, ExternalLink, FileText, Mail, RefreshCw,
  AlertTriangle, Ticket, Clock, Banknote, Landmark, DoorOpen, User, Phone, School,
} from 'lucide-react'
import RangeelaTabs from './RangeelaTabs'
import { rgApi, fmtTime, type RgTicket, type RgMe } from '@/lib/rangeela-client'

interface Scan { id: number; ticket_id: string | null; code: string | null; result: string; scanned_by: string | null; scanned_at: string }

const isFileLink = (url?: string | null) => !!url && /\.(pdf|heic|heif)$/i.test(url.toLowerCase().split('?')[0])

const statusBadge = (s: string) =>
  s === 'approved' ? 'border-green-500/30 text-green-700 bg-green-50'
    : s === 'rejected' ? 'border-red-500/30 text-red-600 bg-red-50'
      : 'border-amber-500/30 text-amber-700 bg-amber-50'

export default function RangeelaTicketsPage() {
  const [me, setMe] = useState<RgMe | null>(null)
  const [tickets, setTickets] = useState<RgTicket[]>([])
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [methodFilter, setMethodFilter] = useState('all')
  const [selected, setSelected] = useState<RgTicket | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectNotify, setRejectNotify] = useState(true)
  const [showReject, setShowReject] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 25

  useEffect(() => { load() }, [])

  async function load(silent = false) {
    if (!silent) setLoading(true)
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
      : { kind: 'err', text: `Approved, but the email failed: ${r.data.emailError}. Use "Resend ticket" to try again.` })
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

  // Possible duplicates: same email or same WhatsApp on more than one live ticket
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

  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const rows = filtered.slice((page - 1) * perPage, page * perPage)
  const nameById = useMemo(() => new Map(tickets.map((t) => [t.id, t])), [tickets])

  function exportCSV() {
    const head = ['Ticket', 'Name', 'Email', 'WhatsApp', 'School', 'A/L batch', 'NIC/ID', 'Method', 'Amount', 'Status', 'Approved by', 'Emailed', 'Checked in', 'Checked in by', 'Receipt', 'Submitted']
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
    <div className="space-y-6">
      <RangeelaTabs me={me} subtitle="Ticket requests, payment approvals, cash sales and entrance check in" />

      {loadError && (
        <div className="flex gap-2 items-start p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"><AlertTriangle size={18} className="shrink-0" /> {loadError}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Waiting for approval" value={stats.pending} icon={Clock} tone="text-amber-600" onClick={() => { setStatusFilter('pending'); setPage(1) }} />
        <Stat label="Tickets issued" value={stats.approved} icon={Ticket} tone="text-green-600" sub={`${stats.rejected} rejected · ${stats.total} requests`} onClick={() => { setStatusFilter('approved'); setPage(1) }} />
        <Stat label="Checked in at gate" value={stats.checkedIn} icon={DoorOpen} tone="text-[#7B2FF7]" sub={stats.approved ? `${Math.round((stats.checkedIn / stats.approved) * 100)}% of issued tickets` : ''} onClick={() => { setStatusFilter('checked_in'); setPage(1) }} />
        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #2B1B2E, #4A2A55)' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">Ticket income</div>
          <div className="text-2xl font-bold mt-2">LKR {(stats.bankTotal + stats.cashTotal).toLocaleString()}</div>
          <div className="text-[11px] text-white/60 mt-1 space-y-0.5">
            <div className="flex items-center gap-1.5"><Landmark size={12} /> Bank: {stats.bankCount} · LKR {stats.bankTotal.toLocaleString()}</div>
            <div className="flex items-center gap-1.5"><Banknote size={12} /> Cash: {stats.cashCount} · LKR {stats.cashTotal.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {Object.keys(stats.cashBy).length > 0 && (
        <div className="rounded-2xl bg-white border border-[#E8E8E8] p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-2">Cash collected by account</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.cashBy).map(([k, v]) => (
              <span key={k} className="px-3 py-1.5 rounded-lg bg-[#F5F5F5] text-xs text-[#111]"><b>{k}</b> · {v.count} tickets · LKR {v.total.toLocaleString()}</span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6B6B]" size={16} />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search name, ticket no, email, phone, school, NIC"
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#E8E8E8] rounded-xl text-sm text-[#111] placeholder-[#A3A3A3] focus:outline-none focus:border-[#D1D5DB]" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-4 py-3 bg-white border border-[#E8E8E8] rounded-xl text-sm text-[#111] focus:outline-none cursor-pointer">
          <option value="pending">Waiting for approval ({stats.pending})</option>
          <option value="approved">Approved ({stats.approved})</option>
          <option value="checked_in">Checked in ({stats.checkedIn})</option>
          <option value="rejected">Rejected ({stats.rejected})</option>
          <option value="all">All ({stats.total})</option>
        </select>
        <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1) }}
          className="px-4 py-3 bg-white border border-[#E8E8E8] rounded-xl text-sm text-[#111] focus:outline-none cursor-pointer">
          <option value="all">Bank and cash</option>
          <option value="bank">Bank transfer</option>
          <option value="cash">Cash</option>
        </select>
        <button onClick={() => load()} className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border border-[#E8E8E8] rounded-xl text-xs font-semibold uppercase tracking-wider text-[#111] hover:bg-[#F5F5F5]">
          <RefreshCw size={14} /> Refresh
        </button>
        {(me?.role === 'chairman' || me?.role === 'cfo') && (
          <button onClick={exportCSV} disabled={!filtered.length} className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border border-[#E8E8E8] rounded-xl text-xs font-semibold uppercase tracking-wider text-[#111] hover:bg-[#F5F5F5] disabled:opacity-40">
            <Download size={14} /> CSV
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#111] min-w-[760px]">
            <thead>
              <tr className="border-b border-[#E8E8E8] bg-[#FAFAFA] text-[#6B6B6B] uppercase tracking-widest text-[9px]">
                <th className="p-4 font-semibold">Ticket</th>
                <th className="p-4 font-semibold">Attendee</th>
                <th className="p-4 font-semibold">School</th>
                <th className="p-4 font-semibold text-center">Paid by</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E8]">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-[#6B6B6B] text-xs">Nothing here yet.</td></tr>
              ) : rows.map((t) => (
                <tr key={t.id} onClick={() => open(t)} className="hover:bg-[#FAFAFA] cursor-pointer">
                  <td className="p-4">
                    <div className="font-mono font-bold text-[#7B2FF7]">{t.ticket_number}</div>
                    {dupes.has(t.id) && <div className="inline-flex items-center gap-1 mt-1 text-[10px] text-orange-600 font-semibold"><AlertTriangle size={11} /> Possible duplicate</div>}
                  </td>
                  <td className="p-4">
                    <div className="font-semibold">{t.full_name}</div>
                    <div className="text-[11px] text-[#6B6B6B] mt-0.5">{t.email}</div>
                  </td>
                  <td className="p-4">
                    <div>{t.school}</div>
                    <div className="text-[11px] text-[#6B6B6B] mt-0.5">{t.al_batch}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px]">{t.payment_method === 'cash' ? <><Banknote size={13} /> Cash</> : <><Landmark size={13} /> Bank</>}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border ${statusBadge(t.status)}`}>{t.status}</span>
                    {t.checked_in_at && <div className="text-[10px] text-[#7B2FF7] font-semibold mt-1">Checked in</div>}
                    {t.status === 'approved' && t.email_error && <div className="text-[10px] text-red-600 font-semibold mt-1">Email failed</div>}
                  </td>
                  <td className="p-4 text-[#6B6B6B]">{fmtTime(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="px-5 py-3 bg-[#FAFAFA] border-t border-[#E8E8E8] flex items-center justify-between text-[11px] text-[#6B6B6B]">
            <span>Page {page} of {pages} · {filtered.length} tickets</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-[#E8E8E8] bg-white disabled:opacity-40">Previous</button>
              <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-[#E8E8E8] bg-white disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Recent gate scans */}
      {scans.length > 0 && (
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-3">Recent gate scans</div>
          <div className="divide-y divide-[#F0F0F0]">
            {scans.slice(0, 15).map((s) => {
              const t = s.ticket_id ? nameById.get(s.ticket_id) : undefined
              const tone = s.result === 'admitted' ? 'text-green-700' : s.result === 'already_used' ? 'text-red-600' : 'text-amber-700'
              return (
                <div key={s.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className={`font-bold uppercase text-[10px] w-24 ${tone}`}>{s.result.replace('_', ' ')}</span>
                  <span className="font-semibold text-[#111]">{t ? `${t.full_name} (${t.ticket_number})` : s.code}</span>
                  <span className="text-[#6B6B6B] ml-auto">{s.scanned_by} · {fmtTime(s.scanned_at)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Drawer */}
      {selected && (
        <div className="fixed inset-0 z-[1000] flex justify-end">
          <div onClick={() => setSelected(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg h-full bg-white overflow-y-auto">
            <div style={{ height: 5, background: 'linear-gradient(90deg,#E6007E,#FF7A00,#FFC300,#0FB5AE,#2F6BFF,#7B2FF7)' }} />
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-lg font-bold text-[#7B2FF7]">{selected.ticket_number}</div>
                  <div className="text-[11px] text-[#6B6B6B]">Submitted {fmtTime(selected.created_at)}{selected.source === 'cash_desk' ? ` · cash desk (${selected.created_by})` : ''}</div>
                </div>
                <button onClick={() => setSelected(null)} className="text-[#6B6B6B] hover:text-[#111]"><X size={20} /></button>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border ${statusBadge(selected.status)}`}>{selected.status}</span>
                {selected.checked_in_at && <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase border border-purple-300 text-[#7B2FF7] bg-purple-50">Checked in {fmtTime(selected.checked_in_at)}</span>}
                {dupes.has(selected.id) && <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase border border-orange-300 text-orange-700 bg-orange-50">Possible duplicate</span>}
              </div>

              {notice && (
                <div className={`flex gap-2 items-start p-3 rounded-xl text-xs ${notice.kind === 'ok' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {notice.kind === 'ok' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />} {notice.text}
                </div>
              )}

              <div className="border border-[#E8E8E8] rounded-xl divide-y divide-[#F0F0F0] text-sm">
                <Row icon={User} label="Name" value={selected.full_name} />
                <Row icon={Mail} label="Email" value={selected.email} />
                <Row icon={Phone} label="WhatsApp" value={<a className="text-[#16A34A] font-semibold" href={`https://wa.me/${selected.whatsapp.replace(/\D/g, '').replace(/^0/, '94')}`} target="_blank" rel="noreferrer">{selected.whatsapp}</a>} />
                <Row icon={School} label="School" value={`${selected.school} · ${selected.al_batch}`} />
                <Row icon={Ticket} label="NIC / ID" value={<span className="font-mono">{selected.nic}</span>} />
                <Row icon={selected.payment_method === 'cash' ? Banknote : Landmark} label="Payment" value={`LKR ${Number(selected.amount).toLocaleString()} · ${selected.payment_method === 'cash' ? 'Cash' : 'Bank transfer'}`} />
                {selected.approved_by && <Row icon={CheckCircle2} label="Approved" value={`${selected.approved_by} · ${fmtTime(selected.approved_at)}`} />}
                {selected.ticket_emailed_at && <Row icon={Mail} label="Ticket emailed" value={fmtTime(selected.ticket_emailed_at)} />}
                {selected.checked_in_by && <Row icon={DoorOpen} label="Scanned by" value={selected.checked_in_by} />}
                {selected.reject_reason && <Row icon={XCircle} label="Reject note" value={selected.reject_reason} />}
                {selected.notes && <Row icon={FileText} label="Notes" value={selected.notes} />}
              </div>

              {selected.email_error && selected.status === 'approved' && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">Last email attempt failed: {selected.email_error}</div>
              )}

              {selected.payment_method === 'bank' && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-2">Bank receipt</div>
                  {selected.receipt_url ? (
                    isFileLink(selected.receipt_url) ? (
                      <a href={selected.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-3 border border-[#E8E8E8] rounded-xl text-xs text-[#7B2FF7] font-semibold"><FileText size={14} /> Open receipt file <ExternalLink size={12} /></a>
                    ) : (
                      <a href={selected.receipt_url} target="_blank" rel="noreferrer" className="block">
                        <img src={selected.receipt_url} alt="Bank receipt" className="w-full rounded-xl border border-[#E8E8E8]" />
                      </a>
                    )
                  ) : <p className="text-xs text-[#6B6B6B]">No receipt.</p>}
                  <p className="text-[11px] text-[#6B6B6B] mt-2">Check the amount is LKR 1,200 and it went to Sampath Bank 1069 6100 6902 before approving.</p>
                </div>
              )}

              {/* Actions */}
              {me?.can.approve && (
                <div className="space-y-3 pt-1">
                  {selected.status !== 'approved' && (
                    <button onClick={() => approve(selected)} disabled={busy}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                      <CheckCircle2 size={16} /> {busy ? 'Working...' : 'Approve and email QR ticket'}
                    </button>
                  )}

                  {selected.status !== 'rejected' && (selected.status === 'pending' || me.can.revoke) && !selected.checked_in_at && (
                    showReject ? (
                      <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-3">
                        <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} maxLength={500}
                          placeholder="Short note for the student, e.g. The receipt is unclear, or the amount does not match."
                          className="w-full p-3 rounded-lg border border-[#E8E8E8] text-sm text-[#111] bg-white focus:outline-none" />
                        <label className="flex items-center gap-2 text-xs text-[#111]"><input type="checkbox" checked={rejectNotify} onChange={(e) => setRejectNotify(e.target.checked)} /> Email the student about this</label>
                        <div className="flex gap-2">
                          <button onClick={() => reject(selected)} disabled={busy} className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 text-white disabled:opacity-50">
                            {selected.status === 'approved' ? 'Cancel ticket' : 'Reject request'}
                          </button>
                          <button onClick={() => setShowReject(false)} className="px-4 py-2.5 rounded-xl text-xs font-bold border border-[#E8E8E8] bg-white">Back</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowReject(true)} disabled={busy}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border border-[#E8E8E8] text-red-600 bg-white hover:bg-red-50">
                        <XCircle size={16} /> {selected.status === 'approved' ? 'Cancel this ticket' : 'Reject'}
                      </button>
                    )
                  )}

                  {me.can.edit && (
                    <div className="p-4 rounded-xl border border-[#E8E8E8] space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">Wrong email? Fix it here</div>
                      <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email"
                        className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E8] text-sm text-[#111] focus:outline-none" />
                      <button onClick={() => resend(selected)} disabled={busy}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#111] text-white disabled:opacity-50">
                        <Mail size={14} /> {selected.status === 'approved' ? 'Save and resend ticket' : 'Save email'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, icon: Icon, tone, onClick }: { label: string; value: number; sub?: string; icon: React.ElementType; tone: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="text-left rounded-2xl p-5 bg-white border border-[#E8E8E8] hover:border-[#D1D5DB] transition-all">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">{label} <Icon size={15} className={tone} /></div>
      <div className={`text-3xl font-bold mt-2 ${tone}`}>{value}</div>
      {sub && <div className="text-[11px] text-[#6B6B6B] mt-1">{sub}</div>}
    </button>
  )
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <Icon size={15} className="text-[#6B6B6B] mt-0.5 shrink-0" />
      <span className="text-[11px] uppercase tracking-wider text-[#6B6B6B] w-24 shrink-0 mt-0.5">{label}</span>
      <span className="text-[#111] break-words min-w-0 flex-1">{value}</span>
    </div>
  )
}
