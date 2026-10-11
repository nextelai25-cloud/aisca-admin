'use client'

import React, { useMemo, useState } from 'react'
import { Plus, Pencil, Eye, ShieldCheck } from 'lucide-react'
import { useC360 } from '../_c360/context'
import { Card, DaysBadge } from '../_c360/ui'
import RecordSheet, { type FieldDef } from '../_c360/RecordSheet'
import { LIKELIHOOD, IMPACT, RISK_STATUSES, daysLeft, fmtDate, type Risk } from '@/lib/c360'

const LEVEL: Record<string, { bg: string; fg: string }> = {
  Low: { bg: '#F2F2F7', fg: '#48484A' }, Medium: { bg: '#FFF6E0', fg: '#8A5A00' }, High: { bg: '#FFEBDD', fg: '#B54708' }, Critical: { bg: '#FDECEC', fg: '#B42318' },
}
const RS: Record<string, { bg: string; fg: string }> = {
  Open: { bg: '#F2F2F7', fg: '#1D1D1F' }, Watching: { bg: '#E6EEFF', fg: '#3360C9' }, Triggered: { bg: '#FDECEC', fg: '#B42318' }, Closed: { bg: '#E8F7E8', fg: '#1A7F1A' },
}
const score = (r: Risk) => (LIKELIHOOD.indexOf(r.likelihood as never) + 1) * (IMPACT.indexOf(r.impact as never) + 1)

export default function RisksPage() {
  const { data, save } = useC360()
  const d = data!
  const [edit, setEdit] = useState<Risk | 'new' | null>(null)
  const [showClosed, setShowClosed] = useState(false)
  const owners = [...new Set([...d.teams.map((t) => t.name), ...d.people.map((p) => p.name)])]
  const FIELDS: FieldDef[] = [
    { key: 'risk', label: 'Risk', type: 'long' },
    { key: 'likelihood', label: 'Likelihood', type: 'select', options: LIKELIHOOD }, { key: 'impact', label: 'Impact', type: 'select', options: IMPACT },
    { key: 'owner', label: 'Owner', type: 'list', options: owners }, { key: 'decide_by', label: 'Decide by', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: RISK_STATUSES }, { key: 'n', label: 'Number', type: 'int' },
    { key: 'warning', label: 'Early warning sign', type: 'long' }, { key: 'response', label: 'Pre-agreed response', type: 'long' },
  ]
  const risks = useMemo(() => [...d.risks].filter((r) => showClosed || r.status !== 'Closed')
    .sort((a, b) => (a.status === 'Closed' ? 1 : 0) - (b.status === 'Closed' ? 1 : 0) || (a.decide_by || '9999').localeCompare(b.decide_by || '9999')), [d.risks, showClosed])
  const closed = d.risks.filter((r) => r.status === 'Closed').length

  // 3 × 4 heat grid: count of open risks per likelihood/impact cell
  const grid = LIKELIHOOD.slice().reverse().map((l) => IMPACT.map((i) => d.risks.filter((r) => r.status !== 'Closed' && r.likelihood === l && r.impact === i)))

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="c3-greet">Risks</h1>
          <p className="c3-lead">Decide the response now, in calm conditions. Nobody makes good decisions in the last week.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {closed > 0 && <button className={`c3-toggle ${showClosed ? 'on' : ''}`} onClick={() => setShowClosed((v) => !v)}>Show closed · {closed}</button>}
          <button className="c3-btn dark" onClick={() => setEdit('new')}><Plus size={16} /> Add risk</button>
        </div>
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(4, 64px)', gap: 4, fontSize: 12 }}>
            {grid.map((row, ri) => (
              <React.Fragment key={ri}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#6E6E73', fontWeight: 600 }}>{LIKELIHOOD[LIKELIHOOD.length - 1 - ri]}</div>
                {row.map((cell, ci) => {
                  const sev = (LIKELIHOOD.length - ri) * (ci + 1)
                  const bg = cell.length ? (sev >= 9 ? '#D03B3B' : sev >= 6 ? '#EC835A' : sev >= 3 ? '#FAB219' : '#AEAEB2') : '#F5F5F7'
                  return <div key={ci} data-tip={cell.length ? cell.map((r) => `${r.n}. ${r.risk}`).join('\n') : 'No risks'} style={{ height: 40, borderRadius: 10, background: bg, color: cell.length ? '#fff' : '#C7C7CC', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 }}>{cell.length || ''}</div>
                })}
              </React.Fragment>
            ))}
            <div />
            {IMPACT.map((i) => <div key={i} style={{ textAlign: 'center', color: '#6E6E73', fontWeight: 600 }}>{i}</div>)}
          </div>
          <div style={{ flex: 1, minWidth: 220, fontSize: 13, color: '#48484A', lineHeight: 1.5 }}>
            <b style={{ color: '#1D1D1F' }}>Likelihood × impact.</b> Each cell shows how many open risks sit there; hover to see them. Work the top right first, and act on the early warning sign, not the failure.
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {risks.map((r) => {
          const days = daysLeft(r.decide_by)
          const urgent = r.status !== 'Closed' && days !== null && days <= 7
          return (
            <Card key={r.id} style={{ borderColor: r.status === 'Triggered' ? '#F3C9C5' : urgent ? '#E5E5EA' : undefined, opacity: r.status === 'Closed' ? .7 : 1 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <span className="c3-tile" style={{ width: 36, height: 36, fontSize: 15, background: score(r) >= 9 ? '#FDECEC' : '#F2F2F7', color: score(r) >= 9 ? '#B42318' : '#48484A' }}>{r.n}</span>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.35 }}>{r.risk}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                    {r.likelihood && <span className="c3-chip sm" style={{ background: LEVEL[r.likelihood]?.bg, color: LEVEL[r.likelihood]?.fg }}>{r.likelihood} likelihood</span>}
                    {r.impact && <span className="c3-chip sm" style={{ background: LEVEL[r.impact]?.bg, color: LEVEL[r.impact]?.fg }}>{r.impact} impact</span>}
                    {r.owner && <span className="c3-sub" style={{ margin: 0 }}>· {r.owner}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="c3-label">Decide by</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(r.decide_by)} {r.status !== 'Closed' && <DaysBadge days={days} />}</div>
                  </div>
                  <select className="c3-chip" value={r.status} onChange={(e) => save('risks', { id: r.id, status: e.target.value })}
                    style={{ background: RS[r.status]?.bg, color: RS[r.status]?.fg, border: 'none', cursor: 'pointer', appearance: 'auto' }} aria-label={`Status of risk ${r.n}`}>
                    {RISK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <button className="c3-icon-btn" onClick={() => setEdit(r)} aria-label={`Edit risk ${r.n}`}><Pencil size={15} /></button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 12 }}>
                {r.warning && <div style={{ fontSize: 13, lineHeight: 1.45, background: '#F5F5F7', borderRadius: 14, padding: 12 }}><div className="c3-label" style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}><Eye size={13} /> Early warning</div>{r.warning}</div>}
                {r.response && <div style={{ fontSize: 13, lineHeight: 1.45, background: '#F3FAF3', borderRadius: 14, padding: 12 }}><div className="c3-label" style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, color: '#1A7F1A' }}><ShieldCheck size={13} /> Pre-agreed response</div>{r.response}</div>}
              </div>
            </Card>
          )
        })}
      </div>

      {edit && (
        <RecordSheet entity="risks" title={edit === 'new' ? 'New risk' : `Risk ${edit.n}`} fields={FIELDS} row={edit === 'new' ? null : edit}
          defaults={{ n: Math.max(0, ...d.risks.map((r) => r.n)) + 1, status: 'Open' }} onClose={() => setEdit(null)} canDelete={d.me.can.delete} deleteLabel={edit === 'new' ? '' : `risk ${edit.n}`} />
      )}
    </>
  )
}
