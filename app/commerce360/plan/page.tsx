'use client'

import React, { useState } from 'react'
import { Plus, Pencil, Flag } from 'lucide-react'
import { useC360 } from '../_c360/context'
import { Card, Bar } from '../_c360/ui'
import RecordSheet, { type FieldDef } from '../_c360/RecordSheet'
import { todayISO, taskPct, type Week } from '@/lib/c360'

const FIELDS: FieldDef[] = [
  { key: 'week', label: 'Week', placeholder: 'W5' }, { key: 'dates', label: 'Dates label', placeholder: '5-11 Oct' },
  { key: 'start_date', label: 'Starts', type: 'date' }, { key: 'end_date', label: 'Ends', type: 'date' },
  { key: 'focus', label: 'The one thing that must happen', type: 'long' }, { key: 'also', label: 'Also running', type: 'long' },
  { key: 'gate', label: 'Gate this week', span: true },
]

export default function PlanPage() {
  const { data } = useC360()
  const d = data!
  const today = todayISO()
  const [edit, setEdit] = useState<Week | 'new' | null>(null)
  const weeks = [...d.weeks].sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="c3-greet">Weekly Plan</h1>
          <p className="c3-lead">One dominant priority per week, from kickoff to event day.</p>
        </div>
        <button className="c3-btn dark" onClick={() => setEdit('new')}><Plus size={16} /> Add week</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {weeks.map((w) => {
          const now = !!(w.start_date && w.end_date && w.start_date <= today && today <= w.end_date)
          const past = !!(w.end_date && w.end_date < today)
          const due = d.tasks.filter((t) => t.deadline && w.start_date && w.end_date && t.deadline >= w.start_date && t.deadline <= w.end_date)
          const done = due.filter((t) => t.status === 'Done').length
          const pct = due.length ? due.reduce((n, t) => n + taskPct(t), 0) / due.length : 0
          return (
            <Card key={w.id} style={{ borderColor: now ? '#1D1D1F' : undefined, opacity: past ? .72 : 1, boxShadow: now ? '0 8px 30px -12px rgba(0,0,0,.25)' : undefined }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: 84, flexShrink: 0 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em' }}>{w.week}</div>
                  <div className="c3-sub" style={{ marginTop: 0 }}>{w.dates}</div>
                  {now && <span className="c3-chip sm" style={{ background: '#1D1D1F', color: '#fff', marginTop: 6 }}>This week</span>}
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>{w.focus}</div>
                  {w.also && <div className="c3-sub" style={{ marginTop: 6 }}>Also running: {w.also}</div>}
                  {w.gate && w.gate !== '-' && <span className="c3-chip" style={{ marginTop: 10, background: '#EFE9FF', color: '#6E4BD8' }}><Flag size={12} /> {w.gate}</span>}
                </div>
                <div style={{ width: 200, flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span className="c3-muted">{due.length} task{due.length === 1 ? '' : 's'} due</span><b>{due.length ? `${done}/${due.length}` : '—'}</b>
                  </div>
                  <Bar pct={pct} color={past && pct < 100 && due.length ? '#D03B3B' : '#1D1D1F'} tip={`${Math.round(pct)}% of this week's tasks complete`} />
                </div>
                <button className="c3-icon-btn" onClick={() => setEdit(w)} aria-label={`Edit ${w.week}`}><Pencil size={15} /></button>
              </div>
            </Card>
          )
        })}
      </div>

      {edit && (
        <RecordSheet entity="weeks" title={edit === 'new' ? 'New week' : `${edit.week} · ${edit.dates || ''}`} fields={FIELDS} row={edit === 'new' ? null : edit}
          defaults={{ week: `W${weeks.length + 1}` }} onClose={() => setEdit(null)} canDelete={d.me.can.delete} deleteLabel={edit === 'new' ? '' : edit.week} />
      )}
    </>
  )
}
