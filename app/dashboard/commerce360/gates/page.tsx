'use client'

import React, { useState } from 'react'
import { Plus, Check, Pencil, Unlock, TriangleAlert } from 'lucide-react'
import { useC360 } from '../_c360/context'
import { Card, StatusSelect, DaysBadge, Bar } from '../_c360/ui'
import RecordSheet, { type FieldDef } from '../_c360/RecordSheet'
import { STATUS_STYLE, TASK_STATUSES, daysLeft, fmtDate, todayISO, type Gate } from '@/lib/c360'

const FIELDS: FieldDef[] = [
  { key: 'n', label: 'Gate number', type: 'int' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'title', label: 'Gate', type: 'long', placeholder: 'What must be true by this date' },
  { key: 'status', label: 'Status', type: 'select', options: TASK_STATUSES },
  { key: 'unlocks', label: 'What it unlocks', type: 'long' },
  { key: 'slip', label: 'What happens if it slips', type: 'long' },
]

export default function GatesPage() {
  const { data, save } = useC360()
  const d = data!
  const today = todayISO()
  const [edit, setEdit] = useState<Gate | 'new' | null>(null)
  const gates = [...d.gates].sort((a, b) => a.n - b.n)
  const done = gates.filter((g) => g.status === 'Done').length
  const next = gates.find((g) => g.status !== 'Done')

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="c3-greet">Critical Path</h1>
          <p className="c3-lead">If one of these slips, everything after it slips. Review them first at every Sunday meeting.</p>
        </div>
        <button className="c3-btn dark" onClick={() => setEdit('new')}><Plus size={16} /> Add gate</button>
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div><div className="c3-stat-num">{done}/{gates.length}</div><div className="c3-sub">gates passed</div></div>
          <div style={{ flex: 1, minWidth: 200 }}><Bar pct={gates.length ? (done / gates.length) * 100 : 0} height={10} /></div>
          {next && <div style={{ textAlign: 'right' }}><div className="c3-sub">Next gate</div><b>{next.title}</b> <DaysBadge days={daysLeft(next.date)} /></div>}
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {gates.map((g, i) => {
          const st = STATUS_STYLE[g.status]
          const late = g.status !== 'Done' && !!g.date && g.date < today
          const isNext = g.id === next?.id
          return (
            <div key={g.id} style={{ display: 'flex', gap: 16, position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
                <span style={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0, zIndex: 1,
                  background: g.status === 'Done' ? st.dot : isNext ? '#1D1D1F' : '#fff', color: g.status === 'Done' || isNext ? '#fff' : late ? '#B42318' : '#1D1D1F',
                  border: `2px solid ${g.status === 'Done' ? st.dot : late ? '#D03B3B' : isNext ? '#1D1D1F' : '#D1D1D6'}` }}>
                  {g.status === 'Done' ? <Check size={18} strokeWidth={3} /> : g.n}
                </span>
                {i < gates.length - 1 && <span style={{ flex: 1, width: 2, background: g.status === 'Done' ? STATUS_STYLE.Done.dot : '#E5E5EA', minHeight: 16 }} />}
              </div>
              <Card style={{ flex: 1, marginBottom: 12, borderColor: isNext ? '#1D1D1F' : late ? '#F3C9C5' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div className="c3-sub" style={{ marginTop: 0, fontWeight: 600 }}>Gate {g.n} · {fmtDate(g.date, true)}{isNext ? ' · next' : ''}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35, marginTop: 2 }}>{g.title}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {g.status !== 'Done' && <DaysBadge days={daysLeft(g.date)} />}
                    <StatusSelect value={g.status} onChange={(v) => save('gates', { id: g.id, status: v })} />
                    <button className="c3-icon-btn" onClick={() => setEdit(g)} aria-label={`Edit gate ${g.n}`}><Pencil size={15} /></button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>
                  {g.unlocks && <div style={{ fontSize: 13, lineHeight: 1.45, background: '#F5F5F7', borderRadius: 14, padding: 12 }}><div className="c3-label" style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}><Unlock size={13} /> Unlocks</div>{g.unlocks}</div>}
                  {g.slip && <div style={{ fontSize: 13, lineHeight: 1.45, background: '#FFF7F6', borderRadius: 14, padding: 12 }}><div className="c3-label" style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, color: '#B42318' }}><TriangleAlert size={13} /> If it slips</div>{g.slip}</div>}
                </div>
              </Card>
            </div>
          )
        })}
      </div>

      {edit && (
        <RecordSheet entity="gates" title={edit === 'new' ? 'New gate' : `Gate ${edit.n}`} fields={FIELDS}
          row={edit === 'new' ? null : edit} defaults={{ n: (gates.at(-1)?.n || 0) + 1, status: 'Not Started' }}
          onClose={() => setEdit(null)} canDelete={d.me.can.delete} deleteLabel={edit === 'new' ? '' : `gate ${edit.n}`} />
      )}
    </>
  )
}
