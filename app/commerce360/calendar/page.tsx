'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Flag, Handshake, ShieldAlert } from 'lucide-react'
import { useC360 } from '../_c360/context'
import { Card, CardHead, StatusChip, Empty, Avatar } from '../_c360/ui'
import { STATUS_STYLE, todayISO, fmtDate, isOverdue, SPONSOR_DONE, SPONSOR_LOST } from '@/lib/c360'

type Item = { key: string; kind: 'task' | 'gate' | 'sponsor' | 'risk' | 'event'; label: string; sub?: string; color: string; late?: boolean; taskId?: string; status?: string; owner?: string | null }
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CalendarPage() {
  const { data, openTask } = useC360()
  const d = data!
  const today = todayISO()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [day, setDay] = useState(today)
  const [show, setShow] = useState({ task: true, gate: true, sponsor: true, risk: true })

  const byDay = useMemo(() => {
    const m = new Map<string, Item[]>()
    const add = (date: string | null, it: Item) => { if (!date) return; m.set(date, [...(m.get(date) || []), it]) }
    add(d.settings.event_date, { key: 'event', kind: 'event', label: `${d.settings.event_name} event day`, sub: d.settings.venue || undefined, color: '#1D1D1F' })
    if (show.task) for (const t of d.tasks) add(t.deadline, { key: t.id, kind: 'task', label: t.title, sub: `#${t.code}${t.team ? ` · ${t.team}` : ''}`, color: STATUS_STYLE[t.status].dot, late: isOverdue(t), taskId: t.id, status: t.status, owner: t.owner })
    if (show.gate) for (const g of d.gates) add(g.date, { key: g.id, kind: 'gate', label: `Gate ${g.n}: ${g.title}`, color: '#6E4BD8', status: g.status })
    if (show.sponsor) for (const s of d.sponsors) if (!SPONSOR_DONE.includes(s.status || '') && !SPONSOR_LOST.includes(s.status || '')) add(s.next_action, { key: s.id, kind: 'sponsor', label: `Follow up: ${s.company}`, sub: s.contact || undefined, color: '#A06A00' })
    if (show.risk) for (const r of d.risks) if (r.status !== 'Closed') add(r.decide_by, { key: r.id, kind: 'risk', label: `Decide: ${r.risk}`, sub: r.owner || undefined, color: '#B42318' })
    return m
  }, [d, show])

  const grid = useMemo(() => {
    const [y, mo] = month.split('-').map(Number)
    const first = new Date(Date.UTC(y, mo - 1, 1))
    const lead = (first.getUTCDay() + 6) % 7
    const daysIn = new Date(Date.UTC(y, mo, 0)).getUTCDate()
    const cells: (string | null)[] = Array(lead).fill(null)
    for (let i = 1; i <= daysIn; i++) cells.push(`${month}-${String(i).padStart(2, '0')}`)
    while (cells.length % 7) cells.push(null)
    return cells
  }, [month])

  const shiftMonth = (n: number) => {
    const [y, mo] = month.split('-').map(Number)
    const dt = new Date(Date.UTC(y, mo - 1 + n, 1))
    setMonth(dt.toISOString().slice(0, 7))
  }
  const monthLabel = new Date(month + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const dayItems = byDay.get(day) || []
  const Icon = ({ k }: { k: Item['kind'] }) => k === 'gate' ? <Flag size={12} /> : k === 'sponsor' ? <Handshake size={12} /> : k === 'risk' ? <ShieldAlert size={12} /> : null

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="c3-greet">Calendar</h1>
          <p className="c3-lead">Deadlines, gates, sponsor follow-ups and risk decisions.</p>
        </div>
        <div className="c3-toolbar">
          {(['task', 'gate', 'sponsor', 'risk'] as const).map((k) => (
            <button key={k} className={`c3-toggle ${show[k] ? 'on' : ''}`} onClick={() => setShow((s) => ({ ...s, [k]: !s[k] }))}>
              {k === 'task' ? 'Tasks' : k === 'gate' ? 'Gates' : k === 'sponsor' ? 'Sponsors' : 'Risks'}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <h2 className="c3-h" style={{ flex: 1 }}>{monthLabel}</h2>
          <button className="c3-icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <button className="c3-btn" style={{ height: 36 }} onClick={() => { setMonth(today.slice(0, 7)); setDay(today) }}>Today</button>
          <button className="c3-icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
          {WEEKDAYS.map((w) => <div key={w} style={{ fontSize: 12, color: '#6E6E73', fontWeight: 600, textAlign: 'center', paddingBottom: 4 }}>{w}</div>)}
          {grid.map((iso, i) => {
            if (!iso) return <div key={`x${i}`} />
            const items = byDay.get(iso) || []
            const isToday = iso === today, isSel = iso === day, isEvent = iso === d.settings.event_date
            const late = items.some((x) => x.late)
            return (
              <button key={iso} onClick={() => setDay(iso)} aria-label={`${fmtDate(iso, true)}, ${items.length} items`}
                style={{ minHeight: 92, textAlign: 'left', padding: 8, borderRadius: 14, border: `1px solid ${isSel ? '#1D1D1F' : '#EDEDF0'}`, background: isEvent ? '#1D1D1F' : iso < today ? '#FAFAFB' : '#fff', color: isEvent ? '#fff' : '#1D1D1F', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, font: 'inherit' }}>
                <span style={{ display: 'inline-grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', fontSize: 13, fontWeight: 700, background: isToday ? '#3360C9' : 'transparent', color: isToday ? '#fff' : undefined }}>{Number(iso.slice(8))}</span>
                <span className="c3-cal-items" style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  {items.slice(0, 3).map((it) => (
                    <span key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, lineHeight: '15px', minWidth: 0 }}>
                      <span className="c3-dot" style={{ background: isEvent ? '#fff' : it.color, width: 6, height: 6 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: it.late ? '#B42318' : undefined }}>{it.label}</span>
                    </span>
                  ))}
                  {items.length > 3 && <span style={{ fontSize: 11, color: isEvent ? '#ddd' : '#6E6E73', fontWeight: 600 }}>+{items.length - 3} more</span>}
                </span>
                {late && <span style={{ marginTop: 'auto', fontSize: 10, fontWeight: 700, color: '#B42318' }}>OVERDUE</span>}
              </button>
            )
          })}
        </div>
        <style>{`@media (max-width: 760px) { .c3-cal-items span span:last-child { display: none } }`}</style>
      </Card>

      <Card>
        <CardHead title={fmtDate(day, true)} sub={`${dayItems.length} item${dayItems.length === 1 ? '' : 's'}`} />
        {dayItems.length === 0 ? <Empty text="Nothing on this day." /> : (
          <div className="c3-rows">
            {dayItems.map((it) => {
              const body = (
                <>
                  <span className="c3-dot" style={{ background: it.color, width: 10, height: 10 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}><Icon k={it.kind} />{it.label}</div>
                    {it.sub && <div className="c3-sub" style={{ marginTop: 0 }}>{it.sub}</div>}
                  </div>
                  {it.kind === 'task' && <Avatar name={it.owner || null} size={24} />}
                  {(it.kind === 'task' || it.kind === 'gate') && it.status && <StatusChip status={it.status} small />}
                </>
              )
              if (it.taskId) return <button key={it.key} className="c3-row" onClick={() => openTask(it.taskId!)}>{body}</button>
              const href = it.kind === 'gate' ? 'gates' : it.kind === 'sponsor' ? 'sponsors' : it.kind === 'risk' ? 'risks' : ''
              return <Link key={it.key} href={`/commerce360/${href}`} className="c3-row">{body}</Link>
            })}
          </div>
        )}
      </Card>
    </>
  )
}
