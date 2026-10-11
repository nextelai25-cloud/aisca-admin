'use client'

import React, { useMemo, useState } from 'react'
import { Plus, Search, Download, Phone, Mail } from 'lucide-react'
import { useC360 } from '../_c360/context'
import { Card, CardHead, Bar, DaysBadge, Tile, Empty } from '../_c360/ui'
import RecordSheet, { type FieldDef } from '../_c360/RecordSheet'
import { SPONSOR_STATUSES, TIERS, SPONSOR_DONE, SPONSOR_LOST, lkr, lkrShort, daysLeft, fmtDate, todayISO, type Sponsor } from '@/lib/c360'

const SP_STYLE: Record<string, { bg: string; fg: string }> = {
  'Not Contacted': { bg: '#F2F2F7', fg: '#48484A' }, 'Proposal Sent': { bg: '#E6EEFF', fg: '#3360C9' }, 'Meeting Set': { bg: '#EFE9FF', fg: '#6E4BD8' },
  Negotiating: { bg: '#FFF6E0', fg: '#8A5A00' }, 'Verbal Yes': { bg: '#FFF6E0', fg: '#8A5A00' }, CONFIRMED: { bg: '#E8F7E8', fg: '#1A7F1A' },
  Paid: { bg: '#1A7F1A', fg: '#FFFFFF' }, Declined: { bg: '#FDECEC', fg: '#B42318' }, 'No Response': { bg: '#F2F2F7', fg: '#8E8E93' },
}

export default function SponsorsPage() {
  const { data, save } = useC360()
  const d = data!
  const today = todayISO()
  const [edit, setEdit] = useState<Sponsor | 'new' | null>(null)
  const [editTarget, setEditTarget] = useState(false)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [tier, setTier] = useState('')
  const [due, setDue] = useState(false)

  const owners = [...new Set([...d.people.map((p) => p.name), ...d.sponsors.map((s) => s.owner).filter(Boolean)])] as string[]
  const FIELDS: FieldDef[] = [
    { key: 'company', label: 'Company', span: true },
    { key: 'status', label: 'Status', type: 'select', options: SPONSOR_STATUSES },
    { key: 'tier', label: 'Tier target', type: 'select', options: TIERS },
    { key: 'category', label: 'Partner category', placeholder: 'Official Banking Partner' },
    { key: 'ask', label: 'Ask (Rs)', type: 'num' },
    { key: 'confirmed', label: 'Confirmed (Rs)', type: 'num', hint: 'Only what is agreed in writing' },
    { key: 'received', label: 'Received (Rs)', type: 'num' },
    { key: 'contact', label: 'Contact person' },
    { key: 'designation', label: 'Designation' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'intro', label: 'Warm intro via' },
    { key: 'owner', label: 'Owner', type: 'list', options: owners },
    { key: 'first_contact', label: 'First contact', type: 'date' },
    { key: 'last_followup', label: 'Last follow-up', type: 'date' },
    { key: 'next_action', label: 'Next action date', type: 'date' },
    { key: 'n', label: 'Row number', type: 'int' },
    { key: 'notes', label: 'Notes', type: 'long' },
  ]

  const k = useMemo(() => {
    const sp = d.sponsors
    const confirmed = sp.reduce((n, x) => n + Number(x.confirmed || 0), 0)
    const received = sp.reduce((n, x) => n + Number(x.received || 0), 0)
    const asked = sp.filter((x) => !SPONSOR_LOST.includes(x.status || '')).reduce((n, x) => n + Number(x.ask || 0), 0)
    const counts = SPONSOR_STATUSES.map((s) => ({ s, n: sp.filter((x) => (x.status || 'Not Contacted') === s).length }))
    return { confirmed, received, asked, counts, target: Number(d.settings.budget_target || 0) }
  }, [d])

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return d.sponsors.filter((s) =>
      (!status || (s.status || 'Not Contacted') === status) && (!tier || s.tier === tier) &&
      (!due || (s.next_action && s.next_action <= today && !SPONSOR_DONE.includes(s.status || '') && !SPONSOR_LOST.includes(s.status || ''))) &&
      (!qq || [s.company, s.contact, s.category, s.owner, s.notes, s.email].some((x) => x && x.toLowerCase().includes(qq))))
      .sort((a, b) => a.n - b.n)
  }, [d.sponsors, q, status, tier, due, today])
  const maxCount = Math.max(1, ...k.counts.map((c) => c.n))
  const dueCount = d.sponsors.filter((s) => s.next_action && s.next_action <= today && !SPONSOR_DONE.includes(s.status || '') && !SPONSOR_LOST.includes(s.status || '')).length

  async function exportXlsx() {
    const XLSX = await import('xlsx')
    const rows = list.map((s) => ({
      '#': s.n, Company: s.company, 'Partner category': s.category || '', 'Tier target': s.tier || '', 'Ask (Rs)': s.ask ?? '', 'Contact person': s.contact || '',
      Designation: s.designation || '', Phone: s.phone || '', Email: s.email || '', 'Warm intro via': s.intro || '', 'First contact': s.first_contact || '',
      'Last follow-up': s.last_followup || '', 'Next action date': s.next_action || '', Status: s.status || '', 'Confirmed (Rs)': s.confirmed ?? '',
      'Received (Rs)': s.received ?? '', Owner: s.owner || '', Notes: s.notes || '',
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Sponsor Pipeline')
    XLSX.writeFile(wb, `COMMERCE_360_Sponsors_${today}.xlsx`)
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="c3-greet">Sponsors</h1>
          <p className="c3-lead">One row per company. Update before every Sunday review.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="c3-btn" onClick={exportXlsx}><Download size={15} /> Export</button>
          <button className="c3-btn dark" onClick={() => setEdit('new')}><Plus size={16} /> Add company</button>
        </div>
      </div>

      <div className="c3-grid c3-stats">
        {[
          { label: 'Budget target', v: k.target, note: d.me.can.admin ? 'Tap to change' : 'Set by the chairman', onClick: d.me.can.admin ? () => setEditTarget(true) : undefined },
          { label: 'Confirmed', v: k.confirmed, note: k.target ? `${Math.round((k.confirmed / k.target) * 100)}% of target` : '' },
          { label: 'Cash received', v: k.received, note: k.confirmed ? `${Math.round((k.received / k.confirmed) * 100)}% of confirmed` : 'Nothing confirmed yet' },
          { label: 'Gap to close', v: Math.max(0, k.target - k.confirmed), note: `${lkrShort(k.asked)} asked in open conversations` },
        ].map((c) => (
          <Card key={c.label}>
            <div role={c.onClick ? 'button' : undefined} onClick={c.onClick} style={{ cursor: c.onClick ? 'pointer' : 'default' }}>
              <div className="c3-sub" style={{ marginTop: 0, fontWeight: 600 }}>{c.label}</div>
              <div className="c3-stat-num" style={{ marginTop: 4 }}>{lkr(c.v)}</div>
              <div className="c3-stat-note">{c.note}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="c3-grid c3-g2">
        <Card>
          <CardHead title="Progress to target" sub="Confirmed in writing, and cash in the bank" />
          {[{ l: 'Confirmed', v: k.confirmed, c: '#1D1D1F' }, { l: 'Received', v: k.received, c: '#0CA30C' }].map((r) => (
            <div key={r.l} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span>{r.l}</span><b>{k.target ? Math.round((r.v / k.target) * 100) : 0}%</b></div>
              <Bar pct={k.target ? (r.v / k.target) * 100 : 0} color={r.c} height={10} tip={`${lkr(r.v)} of ${lkr(k.target)}`} />
            </div>
          ))}
          <div className="c3-sub">Go/no-go: at least 60% of the budget must be confirmed in writing by 20 October.</div>
        </Card>
        <Card>
          <CardHead title="Pipeline" sub="Companies at each stage" />
          {k.counts.filter((c) => c.n > 0).length === 0 ? <Empty text="No companies yet." /> : k.counts.filter((c) => c.n > 0).map((c) => (
            <button key={c.s} className="c3-row" onClick={() => setStatus(status === c.s ? '' : c.s)} style={{ padding: '6px 4px', background: status === c.s ? '#F5F5F7' : undefined }}>
              <span style={{ width: 110, fontSize: 13, flexShrink: 0 }}>{c.s}</span>
              <span style={{ flex: 1 }}><Bar pct={(c.n / maxCount) * 100} height={8} color="#48484A" tip={`${c.n} companies`} /></span>
              <b style={{ width: 28, textAlign: 'right', fontSize: 13 }}>{c.n}</b>
            </button>
          ))}
        </Card>
      </div>

      <Card style={{ padding: 14 }}>
        <div className="c3-toolbar">
          <div className="c3-tsearch"><Search size={16} /><input className="c3-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, contact, notes" aria-label="Search sponsors" /></div>
          <select className="c3-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All stages</option>{SPONSOR_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          <select className="c3-select" value={tier} onChange={(e) => setTier(e.target.value)} aria-label="Tier"><option value="">All tiers</option>{TIERS.map((t) => <option key={t}>{t}</option>)}</select>
          <button className={`c3-toggle ${due ? 'on' : ''}`} onClick={() => setDue((v) => !v)}>Follow-up due · {dueCount}</button>
        </div>
      </Card>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {list.length === 0 ? <Empty text="No companies match." /> : (
          <div className="c3-table-wrap" style={{ border: 'none', borderRadius: 0, maxHeight: 'calc(100vh - 240px)' }}>
            <table className="c3-table">
              <thead><tr><th>#</th><th>Company</th><th>Tier</th><th>Contact</th><th>Owner</th><th>Next action</th><th>Stage</th><th style={{ textAlign: 'right' }}>Ask</th><th style={{ textAlign: 'right' }}>Confirmed</th><th style={{ textAlign: 'right' }}>Received</th></tr></thead>
              <tbody>
                {list.map((s) => {
                  const st = SP_STYLE[s.status || 'Not Contacted'] || SP_STYLE['Not Contacted']
                  const open = !SPONSOR_DONE.includes(s.status || '') && !SPONSOR_LOST.includes(s.status || '')
                  return (
                    <tr key={s.id} onClick={() => setEdit(s)}>
                      <td className="c3-muted">{s.n}</td>
                      <td style={{ minWidth: 200 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Tile label={s.company.slice(0, 1).toUpperCase()} k={s.company} size={28} />
                          <span><b style={{ fontWeight: 600 }}>{s.company}</b>{s.category && <div className="c3-sub" style={{ marginTop: 0 }}>{s.category}</div>}</span>
                        </span>
                      </td>
                      <td>{s.tier || <span className="c3-muted">—</span>}</td>
                      <td style={{ minWidth: 180 }}>
                        <div>{s.contact || <span className="c3-muted">—</span>}</div>
                        <div style={{ display: 'flex', gap: 10, fontSize: 12 }} onClick={(e) => e.stopPropagation()}>
                          {s.phone && <a href={`tel:${s.phone}`} style={{ color: '#3360C9', display: 'inline-flex', gap: 3, alignItems: 'center' }}><Phone size={11} />{s.phone}</a>}
                          {s.email && <a href={`mailto:${s.email}`} style={{ color: '#3360C9', display: 'inline-flex', gap: 3, alignItems: 'center' }}><Mail size={11} />email</a>}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{s.owner || <span className="c3-muted">—</span>}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{s.next_action ? <>{fmtDate(s.next_action)} {open && <DaysBadge days={daysLeft(s.next_action)} />}</> : <span className="c3-muted">—</span>}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select className="c3-chip" value={s.status || 'Not Contacted'} onChange={(e) => save('sponsors', { id: s.id, status: e.target.value, ...(e.target.value !== s.status ? { last_followup: today } : {}) })}
                          style={{ background: st.bg, color: st.fg, border: 'none', cursor: 'pointer', appearance: 'auto' }} aria-label={`Stage for ${s.company}`}>
                          {SPONSOR_STATUSES.map((x) => <option key={x}>{x}</option>)}
                        </select>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{s.ask ? lkr(s.ask) : <span className="c3-muted">—</span>}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600 }}>{s.confirmed ? lkr(s.confirmed) : <span className="c3-muted">—</span>}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{s.received ? lkr(s.received) : <span className="c3-muted">—</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {edit && (
        <RecordSheet entity="sponsors" title={edit === 'new' ? 'Add company' : edit.company} fields={FIELDS}
          row={edit === 'new' ? null : edit} defaults={{ n: Math.max(0, ...d.sponsors.map((s) => s.n)) + 1, status: 'Not Contacted', first_contact: today }}
          onClose={() => setEdit(null)} canDelete={d.me.can.delete} deleteLabel={edit === 'new' ? '' : edit.company} />
      )}
      {editTarget && (
        <RecordSheet entity="settings" title="Budget target" row={d.settings} onClose={() => setEditTarget(false)}
          fields={[{ key: 'budget_target', label: 'Budget target (Rs)', type: 'num', span: true, hint: 'The full event budget sponsorship must cover.' }]} />
      )}
    </>
  )
}
