'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Download, ChevronLeft, ChevronRight, Rocket, X, User, FileText, ExternalLink } from 'lucide-react'

interface Upload { url: string; filename?: string }
interface App {
  id: string
  application_type: 'self' | 'referral'
  status: string
  referrer_name?: string; referrer_phone?: string; referrer_relationship?: string
  referred_founder_name?: string; referred_founder_phone?: string
  full_name?: string; age?: string; school?: string; district?: string; whatsapp?: string; email?: string; social_handle?: string
  venture_name?: string; venture_description?: string; venture_start?: string; venture_stage?: string; role?: string
  proud_achievement?: string; story?: string; work_links?: string
  willing_podcast?: boolean; consent?: boolean; guardian_consent?: boolean
  uploads?: Upload[]
  created_at: string
}

const STATUSES = ['new', 'shortlisted', 'selected', 'rejected']
// PDFs and HEIC/HEIF can't be previewed in an <img>, so show a file tile instead.
const noPreview = (url: string) => /\.(pdf|heic|heif)$/i.test(url.toLowerCase().split('?')[0])

const badgeClass = (s: string) =>
  s === 'selected' ? 'border-green-500/30 text-green-600 bg-green-50'
  : s === 'shortlisted' ? 'border-blue-500/30 text-blue-600 bg-blue-50'
  : s === 'rejected' ? 'border-red-500/30 text-red-600 bg-red-50'
  : 'border-amber-500/30 text-amber-600 bg-amber-50'

export default function NextUpPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<App[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const perPage = 20
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<App | null>(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const { data: rows, error } = await supabase
        .from('nextup_applications')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) { console.error('nextup fetch:', error.message); return }
      setData((rows || []) as App[])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function setStatus(app: App, status: string) {
    setUpdatingId(app.id)
    try {
      const { error } = await supabase.from('nextup_applications').update({ status }).eq('id', app.id)
      if (error) { alert(error.message); return }
      setData(prev => prev.map(a => a.id === app.id ? { ...a, status } : a))
      setSelected(s => s && s.id === app.id ? { ...s, status } : s)
    } finally { setUpdatingId(null) }
  }

  const stats = useMemo(() => ({
    total: data.length,
    self: data.filter(a => a.application_type === 'self').length,
    referral: data.filter(a => a.application_type === 'referral').length,
    selected: data.filter(a => a.status === 'selected').length,
  }), [data])

  const displayName = (a: App) => a.application_type === 'self' ? (a.full_name || '—') : `${a.referrer_name || '—'} → ${a.referred_founder_name || '—'}`

  const filtered = data.filter(a => {
    const q = search.toLowerCase()
    const hay = `${a.full_name || ''} ${a.referrer_name || ''} ${a.referred_founder_name || ''} ${a.school || ''} ${a.venture_name || ''} ${a.whatsapp || ''} ${a.referrer_phone || ''}`.toLowerCase()
    const matchesSearch = hay.includes(q)
    const matchesType = typeFilter === 'all' || a.application_type === typeFilter
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })
  const totalPages = Math.ceil(filtered.length / perPage)
  const current = filtered.slice((page - 1) * perPage, page * perPage)

  function exportCSV() {
    if (!filtered.length) return
    const headers = ['Type', 'Status', 'Name', 'Category', 'School', 'District', 'WhatsApp', 'Email', 'Venture', 'Description', 'Podcast', 'Referrer', 'Referrer Phone', 'Founder Referred', 'Founder Phone', 'Files', 'Date']
    const rows = [headers.join(','), ...filtered.map(a => [
      a.application_type, a.status,
      `"${a.full_name || ''}"`, `"${a.age || ''}"`, `"${a.school || ''}"`, `"${a.district || ''}"`,
      `"${a.whatsapp || ''}"`, `"${a.email || ''}"`, `"${a.venture_name || ''}"`, `"${(a.venture_description || '').replace(/"/g, "'")}"`,
      a.willing_podcast ? 'Yes' : '', `"${a.referrer_name || ''}"`, `"${a.referrer_phone || ''}"`,
      `"${a.referred_founder_name || ''}"`, `"${a.referred_founder_phone || ''}"`, (a.uploads || []).length,
      new Date(a.created_at).toLocaleDateString('en-LK'),
    ].join(','))]
    const uri = encodeURI('data:text/csv;charset=utf-8,' + rows.join('\n'))
    const link = document.createElement('a')
    link.href = uri; link.download = `nextup_applications_${Date.now()}.csv`
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-t-2 border-r-2 border-[#d4af37] rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wider uppercase text-[#111111] flex items-center gap-2"><Rocket size={20} className="text-[#d4af37]" /> NextUp Applications</h1>
          <p className="text-xs text-[#6B6B6B] tracking-wide uppercase mt-1">AISCA × Business Advisor Junior — young founder submissions</p>
        </div>
        <button onClick={exportCSV} disabled={!filtered.length}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F5F5F5] border border-[#E8E8E8] rounded-xl text-xs font-semibold uppercase tracking-wider text-[#111111] hover:bg-[#E8E8E8] disabled:opacity-40 transition-all">
          <Download size={14} /><span>Export CSV ({filtered.length})</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: '#111111' },
          { label: 'Applications', value: stats.self, color: '#111111' },
          { label: 'Referrals', value: stats.referral, color: '#111111' },
          { label: 'Selected', value: stats.selected, color: '#16a34a' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-5 bg-white border border-[#E8E8E8]">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">{s.label}</div>
            <div className="text-3xl font-bold mt-2" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6B6B]" size={16} />
          <input type="text" placeholder="Search name / school / venture / phone…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#E8E8E8] rounded-xl text-xs text-[#111111] placeholder-[#A3A3A3] focus:outline-none focus:border-[#D1D5DB]" />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }} className="w-full px-4 py-3 bg-white border border-[#E8E8E8] rounded-xl text-xs text-[#111111] focus:outline-none cursor-pointer">
          <option value="all">All Types</option>
          <option value="self">Applying for self</option>
          <option value="referral">Referrals</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="w-full px-4 py-3 bg-white border border-[#E8E8E8] rounded-xl text-xs text-[#111111] focus:outline-none cursor-pointer">
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-[#111111]">
            <thead>
              <tr className="border-b border-[#E8E8E8] bg-[#FAFAFA] text-[#6B6B6B] uppercase tracking-widest text-[9px]">
                <th className="p-4 font-semibold">Applicant</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Venture</th>
                <th className="p-4 font-semibold">School / District</th>
                <th className="p-4 font-semibold text-center">Files</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E8]">
              {current.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-[#6B6B6B] uppercase tracking-widest text-[10px]">No applications found.</td></tr>
              ) : current.map(a => (
                <tr key={a.id} onClick={() => setSelected(a)} className="hover:bg-[#FAFAFA] transition-all cursor-pointer">
                  <td className="p-4 font-semibold max-w-[220px]"><span className="truncate block">{displayName(a)}</span></td>
                  <td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${a.application_type === 'self' ? 'border-[#d4af37]/40 text-[#a9832a] bg-[#FBF7EC]' : 'border-[#6B6B6B]/30 text-[#6B6B6B] bg-[#F5F5F5]'}`}>{a.application_type === 'self' ? 'Applicant' : 'Referral'}</span></td>
                  <td className="p-4 max-w-[200px]"><span className="truncate block">{a.venture_name || '—'}</span></td>
                  <td className="p-4 text-[#6B6B6B]">{a.school ? `${a.school}${a.district ? ` · ${a.district}` : ''}` : '—'}</td>
                  <td className="p-4 text-center text-[#6B6B6B]">{(a.uploads || []).length || '—'}</td>
                  <td className="p-4 text-center"><span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border ${badgeClass(a.status)}`}>{a.status}</span></td>
                  <td className="p-4 text-[#6B6B6B]">{new Date(a.created_at).toLocaleDateString('en-LK')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#E8E8E8] flex items-center justify-between gap-4">
            <span className="text-[10px] text-[#6B6B6B] uppercase tracking-widest">Page {page} of {totalPages} ({filtered.length} total)</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg bg-[#F5F5F5] border border-[#E8E8E8] flex items-center justify-center disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg bg-[#F5F5F5] border border-[#E8E8E8] flex items-center justify-center disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div onClick={() => setSelected(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-xl h-full bg-white border-l border-[#E8E8E8] p-8 flex flex-col overflow-y-auto z-10">
            <div className="flex items-center justify-between pb-6 border-b border-[#E8E8E8]">
              <div className="flex items-center gap-3 text-[#d4af37]"><Rocket size={20} /><span className="text-xs font-extrabold uppercase tracking-widest">Application</span></div>
              <button onClick={() => setSelected(null)} className="text-[#6B6B6B] hover:text-[#111111]"><X size={18} /></button>
            </div>

            <div className="space-y-6 pt-6">
              {/* Status control */}
              <div>
                <span className="block text-[9px] font-bold tracking-widest text-[#6B6B6B] uppercase mb-2">Status</span>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => setStatus(selected, s)} disabled={updatingId === selected.id}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase border transition-all ${selected.status === s ? badgeClass(s) : 'border-[#E8E8E8] text-[#6B6B6B] hover:bg-[#FAFAFA]'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {selected.application_type === 'referral' ? (
                <Section title="Referral">
                  <Row label="Referrer" value={`${selected.referrer_name || '—'} · ${selected.referrer_phone || ''}`} />
                  <Row label="How they know them" value={selected.referrer_relationship} />
                  <Row label="Founder referred" value={`${selected.referred_founder_name || '—'} · ${selected.referred_founder_phone || ''}`} />
                </Section>
              ) : (
                <>
                  <Section title="About the applicant">
                    <Row label="Name" value={selected.full_name} />
                    <Row label="Best describes them" value={selected.age} />
                    <Row label="School / District" value={`${selected.school || '—'} · ${selected.district || '—'}`} />
                    <Row label="WhatsApp" value={selected.whatsapp} />
                    <Row label="Email" value={selected.email} />
                    <Row label="Social" value={selected.social_handle} />
                  </Section>
                  <Section title="The venture">
                    <Row label="Name" value={selected.venture_name} />
                    <Row label="What it does" value={selected.venture_description} />
                    <Row label="Started" value={selected.venture_start} />
                    <Row label="Role" value={selected.role} />
                    <Row label="Where it's at" value={selected.venture_stage} />
                    <Row label="Proudest achievement" value={selected.proud_achievement} />
                    <Row label="Links" value={selected.work_links} />
                    <Row label="Willing to do podcast" value={selected.willing_podcast ? 'Yes' : 'No'} />
                  </Section>
                  <Section title="Why NextUp should feature them">
                    <p className="text-xs text-[#111111]/85 leading-relaxed whitespace-pre-wrap">{selected.story || '—'}</p>
                  </Section>
                  <Section title={`Photos & documents (${(selected.uploads || []).length})`}>
                    {(selected.uploads || []).length === 0 ? (
                      <p className="text-xs text-[#6B6B6B]">No files uploaded.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {(selected.uploads || []).map((u, i) => (
                          <a key={i} href={u.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-[#E8E8E8] aspect-square bg-[#FAFAFA]" title={u.filename}>
                            {noPreview(u.url) ? (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-[#6B6B6B] p-2">
                                <FileText size={22} /><span className="text-[9px] flex items-center gap-1">View file <ExternalLink size={9} /></span>
                              </div>
                            ) : (
                              <img src={u.url} alt="" className="w-full h-full object-cover" />
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </Section>
                </>
              )}

              <p className="text-[10px] text-[#6B6B6B]">Submitted {new Date(selected.created_at).toLocaleString('en-LK')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="block text-[9px] font-bold tracking-widest text-[#6B6B6B] uppercase">{title}</span>
      <div className="border border-[#E8E8E8] rounded-xl p-4 space-y-2">{children}</div>
    </div>
  )
}
function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-[#6B6B6B] uppercase tracking-wide">{label}</span>
      <span className="text-xs text-[#111111] whitespace-pre-wrap">{value}</span>
    </div>
  )
}
