'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [batchFilter, setBatchFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [page, setPage] = useState(0)
  const PER_PAGE = 25

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from('aisca_members')
      .select('*')
      .order('participation_score', { ascending: false })
    setMembers(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  useEffect(() => {
    let result = members
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(m =>
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.school?.toLowerCase().includes(q) ||
        m.aisca_id?.toLowerCase().includes(q) ||
        m.phone?.includes(q)
      )
    }
    if (batchFilter !== 'All') result = result.filter(m => m.al_batch === batchFilter)
    if (typeFilter !== 'All') result = result.filter(m => m.member_type === typeFilter)
    setFiltered(result)
    setPage(0)
  }, [search, batchFilter, typeFilter, members])

  const batches = ['All', ...Array.from(new Set(members.map(m => m.al_batch).filter(Boolean))).sort()]
  const types = ['All', ...Array.from(new Set(members.map(m => m.member_type).filter(Boolean)))]
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  // Stats
  const stats = {
    total: members.length,
    associates: members.filter(m => m.member_type_detail?.includes('Associate')).length,
    officials: members.filter(m => m.member_type_detail?.includes('Board Official') || m.member_type_detail?.includes('Official Member')).length,
    batch2026: members.filter(m => m.al_batch === '2026 A/L').length,
    batch2025: members.filter(m => m.al_batch === '2025 A/L').length,
    avgScore: Math.round(members.reduce((s, m) => s + (m.participation_score || 0), 0) / (members.length || 1))
  }

  return (
    <div style={{ padding: '32px', color: '#fff' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '0.05em', margin: 0 }}>
          AISCA MEMBERS DATABASE
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '4px' }}>
          Master registry of all AISCA members across all activities
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '32px' }}>
        {[
          { label: 'TOTAL MEMBERS', value: stats.total },
          { label: 'ASSOCIATES', value: stats.associates },
          { label: 'OFFICIALS', value: stats.officials },
          { label: '2026 BATCH', value: stats.batch2026 },
          { label: '2025 BATCH', value: stats.batch2025 },
          { label: 'AVG SCORE', value: stats.avgScore }
        ].map(s => (
          <div key={s.label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', padding: '16px'
          }}>
            <p style={{ fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', margin: '0 0 8px' }}>
              {s.label}
            </p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#fff', margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, school, phone, AISCA ID..."
          style={{
            flex: 1, minWidth: '280px', padding: '10px 16px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none'
          }}
        />
        <select
          value={batchFilter}
          onChange={e => setBatchFilter(e.target.value)}
          style={{
            padding: '10px 16px', background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer'
          }}
        >
          {batches.map(b => <option key={b} value={b}>{b === 'All' ? 'All Batches' : b}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{
            padding: '10px 16px', background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer'
          }}
        >
          {types.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
        </select>
        <button
          onClick={() => {
            const reason = prompt('Export reason (required):')
            if (!reason) return
            const csv = [
              ['AISCA ID', 'Full Name', 'Email', 'Phone', 'School', 'A/L Batch', 'District', 'Member Type', 'Participation Score'],
              ...filtered.map(m => [m.aisca_id, m.full_name, m.email, m.phone, m.school, m.al_batch, m.district, m.member_type, m.participation_score])
            ].map(r => r.join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `aisca-members-${Date.now()}.csv`
            a.click()
          }}
          style={{
            padding: '10px 20px', background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px', color: '#fff', fontSize: '13px',
            cursor: 'pointer', fontWeight: '600'
          }}
        >
          Export CSV ({filtered.length})
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['FULL NAME', 'EMAIL', 'PHONE', 'SCHOOL', 'A/L BATCH', 'ACTION'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left',
                  fontSize: '10px', letterSpacing: '0.12em',
                  color: 'rgba(255,255,255,0.35)', fontWeight: '600'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading...</td></tr>
            ) : paginated.map((m, i) => (
              <tr
                key={m.id}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                }}
              >
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                  {m.full_name}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
                  {m.email || '—'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
                  {m.phone || '—'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                  {m.school || '—'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                  {m.al_batch || '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    onClick={() => setSelectedMember(m)}
                    style={{
                      padding: '5px 12px', background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px', color: '#fff',
                      cursor: 'pointer', fontSize: '11px'
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
          Showing {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, filtered.length)} of {filtered.length} members
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: page === 0 ? 'rgba(255,255,255,0.2)' : '#fff', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: '12px' }}
          >← Prev</button>
          <span style={{ padding: '6px 12px', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: page >= totalPages - 1 ? 'rgba(255,255,255,0.2)' : '#fff', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', fontSize: '12px' }}
          >Next →</button>
        </div>
      </div>

      {/* Member Detail Modal */}
      {selectedMember && (
        <div
          onClick={() => setSelectedMember(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '680px', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden' }}
          >
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', margin: 0 }}>{selectedMember.full_name}</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '4px 0 0', fontFamily: 'monospace' }}>{selectedMember.aisca_id}</p>
              </div>
              <button onClick={() => setSelectedMember(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', width: '36px', height: '36px', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { label: 'Email', value: selectedMember.email },
                { label: 'Phone', value: selectedMember.phone },
                { label: 'School', value: selectedMember.school },
                { label: 'A/L Batch', value: selectedMember.al_batch },
                { label: 'District', value: selectedMember.district },
                { label: 'Gender', value: selectedMember.gender },
                { label: 'Birthday', value: selectedMember.birthday },
                { label: 'Member Type', value: selectedMember.member_type },
                { label: 'First Activity', value: selectedMember.first_activity_date },
                { label: 'Latest Activity', value: selectedMember.latest_activity_date },
                { label: 'Forms Submitted', value: selectedMember.total_forms_submitted },
                { label: 'Events Attended', value: selectedMember.total_events_attended },
                { label: 'Projects', value: selectedMember.total_projects_attended },
                { label: 'Participation Score', value: selectedMember.participation_score },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', margin: '0 0 4px' }}>{f.label.toUpperCase()}</p>
                  <p style={{ fontSize: '14px', color: '#fff', margin: 0 }}>{f.value || '—'}</p>
                </div>
              ))}
            </div>

            {/* Activities */}
            <div style={{ padding: '0 24px 24px' }}>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', margin: '0 0 12px' }}>ACTIVITIES PARTICIPATED</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  { label: 'Forum', value: selectedMember.appeared_in_forum },
                  { label: 'Board System', value: selectedMember.appeared_in_board_system },
                  { label: 'Beach Cleanup', value: selectedMember.appeared_in_beach_cleanup },
                  { label: 'Economics Seminar', value: selectedMember.appeared_in_economics_seminar },
                  { label: 'Associate Form', value: selectedMember.appeared_in_associate_form },
                  { label: 'Official Database', value: selectedMember.appeared_in_official_database },
                ].map(a => (
                  <span key={a.label} style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                    border: `1px solid ${a.value ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    color: a.value ? '#4ade80' : 'rgba(255,255,255,0.25)',
                    background: a.value ? 'rgba(74,222,128,0.08)' : 'transparent'
                  }}>{a.label}</span>
                ))}
              </div>
              {selectedMember.member_type_detail && (
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '12px' }}>
                  {selectedMember.member_type_detail}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
