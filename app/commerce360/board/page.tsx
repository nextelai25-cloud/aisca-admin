'use client'

import React, { useMemo, useState } from 'react'
import { Plus, Search, CalendarDays, CheckCircle2 } from 'lucide-react'
import { useC360 } from '../_c360/context'
import { Card, Tile, Avatar, Bar, DaysBadge, PriorityChip } from '../_c360/ui'
import { TASK_STATUSES, STATUS_STYLE, daysLeft, fmtDate, teamTag, ownerIncludes, taskPct, type TaskStatus } from '@/lib/c360'

const COL_BG: Record<string, string> = { 'Not Started': '#F5F5F7', 'In Progress': '#FFFAEE', Blocked: '#FFF5F4', Done: '#F3FAF3' }

export default function BoardPage() {
  const { data, openTask, save } = useC360()
  const d = data!
  const [q, setQ] = useState('')
  const [team, setTeam] = useState('')
  const [priority, setPriority] = useState('')
  const [mine, setMine] = useState(false)
  const [doneLimit, setDoneLimit] = useState(12)
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)

  const teams = useMemo(() => [...new Set([...d.teams.map((t) => t.name), ...d.tasks.map((t) => t.team).filter(Boolean)])] as string[], [d])
  const cols = useMemo(() => {
    const qq = q.trim().toLowerCase()
    const f = d.tasks.filter((t) =>
      (!team || t.team === team) && (!priority || t.priority === priority) && (!mine || ownerIncludes(t.owner, d.me.name)) &&
      (!qq || [t.code, t.title, t.owner, t.notes].some((x) => x && x.toLowerCase().includes(qq))))
    return TASK_STATUSES.map((s) => ({
      status: s,
      items: f.filter((t) => t.status === s).sort((a, b) =>
        s === 'Done' ? String(b.completed_at || b.updated_at).localeCompare(String(a.completed_at || a.updated_at))
          : (a.deadline || '9999').localeCompare(b.deadline || '9999') || a.priority.localeCompare(b.priority)),
    }))
  }, [d, q, team, priority, mine])

  async function drop(status: TaskStatus) {
    const id = drag
    setDrag(null); setOver(null)
    const t = d.tasks.find((x) => x.id === id)
    if (t && t.status !== status) await save('tasks', { id: t.id, status })
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="c3-greet">Kanban Board</h1>
          <p className="c3-lead">Drag a card to change its status. Click it to edit.</p>
        </div>
        <button className="c3-btn dark" onClick={() => openTask(null, { team: team || undefined })}><Plus size={16} /> New task</button>
      </div>

      <Card style={{ padding: 14 }}>
        <div className="c3-toolbar">
          <div className="c3-tsearch"><Search size={16} /><input className="c3-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cards" aria-label="Search cards" /></div>
          <select className="c3-select" value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Team"><option value="">All teams</option>{teams.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <select className="c3-select" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority"><option value="">Any priority</option><option>P1</option><option>P2</option><option>P3</option></select>
          <button className={`c3-toggle ${mine ? 'on' : ''}`} onClick={() => setMine((v) => !v)}>Mine</button>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(260px, 1fr))', gap: 14, overflowX: 'auto', paddingBottom: 8, alignItems: 'start' }}>
        {cols.map((c) => {
          const st = STATUS_STYLE[c.status]
          const items = c.status === 'Done' ? c.items.slice(0, doneLimit) : c.items
          return (
            <div key={c.status}
              onDragOver={(e) => { e.preventDefault(); setOver(c.status) }} onDragLeave={() => setOver((o) => (o === c.status ? null : o))} onDrop={() => drop(c.status)}
              style={{ background: COL_BG[c.status], borderRadius: 22, padding: 12, border: `1px solid ${over === c.status ? '#1D1D1F' : '#EDEDF0'}`, minHeight: 200, transition: 'border-color .15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px 12px' }}>
                <span className="c3-dot" style={{ background: st.dot, width: 9, height: 9 }} />
                <b style={{ fontSize: 15 }}>{st.label}</b>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6E6E73', background: '#fff', borderRadius: 999, padding: '2px 8px', border: '1px solid #EDEDF0' }}>{c.items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 'calc(100vh - 290px)', minHeight: 120, overflowY: 'auto', margin: '0 -4px', padding: '0 4px 4px' }}>
                {items.map((t) => {
                  const dl = daysLeft(t.deadline)
                  return (
                    <div key={t.id} draggable onDragStart={() => setDrag(t.id)} onDragEnd={() => { setDrag(null); setOver(null) }}
                      onClick={() => openTask(t.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') openTask(t.id) }}
                      style={{ background: '#fff', borderRadius: 16, padding: 14, border: '1px solid #EDEDF0', boxShadow: '0 1px 2px rgba(0,0,0,.04)', cursor: 'grab', opacity: drag === t.id ? .45 : 1 }}>
                      {c.status === 'Done' ? (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <CheckCircle2 size={22} color={STATUS_STYLE.Done.dot} style={{ flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.35 }}>{t.title}</div>
                            <div className="c3-muted" style={{ fontSize: 12, marginTop: 4 }}><span className="c3-id">#{t.code}</span> · {t.completed_at ? `done ${fmtDate(t.completed_at.slice(0, 10))}` : 'done'}</div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <PriorityChip p={t.priority} /><span className="c3-id">#{t.code}</span>
                            {t.team && <span style={{ marginLeft: 'auto' }}><Tile label={teamTag(t.team)} k={t.team} size={22} /></span>}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{t.title}</div>
                          {c.status === 'In Progress' && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}><Bar pct={taskPct(t)} height={5} /><span style={{ fontSize: 11, fontWeight: 700 }}>{taskPct(t)}%</span></div>}
                          {c.status === 'Blocked' && t.notes && <div style={{ fontSize: 12, color: '#B42318', marginTop: 8, lineHeight: 1.4 }}>{t.notes}</div>}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6E6E73' }}><CalendarDays size={13} />{fmtDate(t.deadline)}</span>
                            <DaysBadge days={dl} />
                            <span style={{ marginLeft: 'auto' }}><Avatar name={t.owner} size={26} /></span>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
                {c.status === 'Done' && c.items.length > doneLimit && (
                  <button className="c3-btn" onClick={() => setDoneLimit((n) => n + 20)}>Show {Math.min(20, c.items.length - doneLimit)} more</button>
                )}
                <button onClick={() => openTask(null, { status: c.status, team: team || undefined })}
                  style={{ height: 44, borderRadius: 14, border: '1px dashed #D1D1D6', background: 'rgba(255,255,255,.6)', fontSize: 13, fontWeight: 600, color: '#1D1D1F', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Plus size={15} /> Add task
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
