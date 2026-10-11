'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Folder, CalendarClock, TriangleAlert, Wallet, TrendingUp, Plus, Check, Flag } from 'lucide-react'
import { useC360 } from './_c360/context'
import { Card, CardHead, Tile, Avatar, Bar, DaysBadge, StatusChip, StatusSelect, PriorityChip, Segmented, Empty } from './_c360/ui'
import { LogLine } from './_c360/TaskSheet'
import {
  todayISO, daysLeft, isOverdue, taskPct, fmtDate, lkr, lkrShort, teamTag, teamShort, STATUS_STYLE, TASK_STATUSES,
  SPONSOR_DONE, SPONSOR_LOST, type Task,
} from '@/lib/c360'

const BASE = '/dashboard/commerce360'

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { timeZone: 'Asia/Colombo', hour: 'numeric', hour12: false }))
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function C360Dashboard() {
  const { data, openTask, save } = useC360()
  const d = data!
  const today = todayISO()
  const [tab, setTab] = useState<'overdue' | 'soon' | 'blocked'>('overdue')

  const s = useMemo(() => {
    const tasks = d.tasks
    const by = (st: string) => tasks.filter((t) => t.status === st).length
    const overdue = tasks.filter(isOverdue).sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))
    const soon = tasks.filter((t) => t.status !== 'Done' && t.deadline && t.deadline >= today && (daysLeft(t.deadline) ?? 99) <= 14)
      .sort((a, b) => (a.deadline! < b.deadline! ? -1 : a.priority < b.priority ? -1 : 1))
    const blocked = tasks.filter((t) => t.status === 'Blocked')
    const progress = tasks.length ? tasks.reduce((n, t) => n + taskPct(t), 0) / tasks.length : 0

    const wsMap = new Map<string, Task[]>()
    for (const t of tasks) { const k = t.workstream || 'Other'; wsMap.set(k, [...(wsMap.get(k) || []), t]) }
    const workstreams = [...wsMap.entries()].map(([name, list]) => ({
      name, total: list.length, done: list.filter((t) => t.status === 'Done').length,
      pct: list.reduce((n, t) => n + taskPct(t), 0) / list.length,
      open: list.filter((t) => t.status !== 'Done').length, late: list.filter(isOverdue).length,
    })).sort((a, b) => b.open - a.open || a.name.localeCompare(b.name))

    const sp = d.sponsors
    const confirmed = sp.reduce((n, x) => n + Number(x.confirmed || 0), 0)
    const received = sp.reduce((n, x) => n + Number(x.received || 0), 0)
    const target = Number(d.settings.budget_target || 0)
    const spActive = sp.filter((x) => !SPONSOR_DONE.includes(x.status || '') && !SPONSOR_LOST.includes(x.status || ''))
    const followups = spActive.filter((x) => x.next_action && x.next_action <= today).length

    const gates = [...d.gates].sort((a, b) => a.n - b.n)
    const week = d.weeks.find((w) => w.start_date && w.end_date && w.start_date <= today && today <= w.end_date)
      || d.weeks.find((w) => w.start_date && w.start_date > today)
    const risks = d.risks.filter((r) => r.status !== 'Closed' && r.decide_by && (daysLeft(r.decide_by) ?? 99) <= 14)
      .sort((a, b) => (a.decide_by! < b.decide_by! ? -1 : 1))

    // team health (same checks as the tracker's "Check" column)
    const workHeads = d.teams.filter((t) => /^T\d+/.test(t.name)).map((t) => t.head).filter(Boolean)
    const teams = d.teams.map((t) => {
      const list = tasks.filter((x) => x.team === t.name)
      const next = list.filter((x) => x.status !== 'Done' && x.deadline).sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))[0]
      const clash = /^T\d+/.test(t.name) && t.head && workHeads.filter((h) => h === t.head).length > 1
      const check = !t.head ? 'Head not set' : clash ? `${t.head} heads two teams` : !t.deputy ? 'Deputy not set' : ''
      return { ...t, open: list.filter((x) => x.status !== 'Done').length, done: list.filter((x) => x.status === 'Done').length, late: list.filter(isOverdue).length, next, check }
    })

    return {
      total: tasks.length, done: by('Done'), inProg: by('In Progress'), notStarted: by('Not Started'), blockedN: blocked.length,
      overdue, soon, blocked, progress, workstreams, confirmed, received, target, followups, gates, week, risks, teams,
      spByStatus: sp.reduce<Record<string, number>>((m, x) => { const k = x.status || 'Not Contacted'; m[k] = (m[k] || 0) + 1; return m }, {}),
    }
  }, [d, today])

  const evDays = daysLeft(d.settings.event_date)
  const nextGate = s.gates.find((g) => g.status !== 'Done')
  const first = (d.me.name || '').split(/\s+/)
  const rows = tab === 'overdue' ? s.overdue : tab === 'soon' ? s.soon : s.blocked

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="c3-greet">{greeting()}, <span>{first[0] || 'there'}</span></h1>
          <p className="c3-lead">Here&apos;s where COMMERCE 360 stands today.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`${BASE}/board`} className="c3-btn">Open board</Link>
          <button className="c3-btn dark" onClick={() => openTask(null)}><Plus size={16} /> New task</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="c3-grid c3-stats">
        <Card><div className="c3-stat">
          <span className="c3-stat-ico" style={{ background: '#E6EEFF', color: '#3360C9' }}><Folder size={24} /></span>
          <div><div className="c3-stat-num">{s.total - s.done}</div><div className="c3-stat-label">Open tasks</div>
            <div className="c3-stat-note good">{s.done} of {s.total} done · {Math.round(s.progress)}% complete</div></div>
        </div></Card>
        <Card><div className="c3-stat">
          <span className="c3-stat-ico" style={{ background: '#EFE9FF', color: '#6E4BD8' }}><CalendarClock size={24} /></span>
          <div><div className="c3-stat-num">{evDays !== null && evDays > 0 ? evDays : '0'}</div><div className="c3-stat-label">Days to event</div>
            <div className="c3-stat-note">{fmtDate(d.settings.event_date, true)}{d.settings.venue ? ` · ${d.settings.venue}` : ''}</div></div>
        </div></Card>
        <Card><div className="c3-stat">
          <span className="c3-stat-ico" style={{ background: s.overdue.length ? '#FDECEC' : '#E8F7E8', color: s.overdue.length ? '#B42318' : '#1A7F1A' }}><TriangleAlert size={24} /></span>
          <div><div className="c3-stat-num">{s.overdue.length}</div><div className="c3-stat-label">Overdue</div>
            <div className={`c3-stat-note ${s.blockedN ? 'bad' : ''}`}>{s.blockedN} blocked · {s.inProg} in progress</div></div>
        </div></Card>
        <Card><div className="c3-stat">
          <span className="c3-stat-ico" style={{ background: '#FFF4D6', color: '#A06A00' }}><Wallet size={24} /></span>
          <div><div className="c3-stat-num">{lkrShort(s.confirmed)}</div><div className="c3-stat-label">Sponsorship confirmed</div>
            <div className="c3-stat-note">{s.target ? `${Math.round((s.confirmed / s.target) * 100)}% of ${lkrShort(s.target)} target` : 'Set a target in Sponsors'}</div></div>
        </div></Card>
      </div>

      {/* workstreams + status/week */}
      <div className="c3-grid c3-g2">
        <Card>
          <CardHead title="Workstreams" info="Share of each workstream's tasks completed. Done counts as 100%." />
          <div className="c3-rows">
            {s.workstreams.map((w) => (
              <Link key={w.name} href={`${BASE}/tasks?ws=${encodeURIComponent(w.name)}`} className="c3-row">
                <Tile label={w.name.slice(0, 1)} k={w.name} size={30} />
                <span className="c3-row-title" style={{ flex: '0 0 32%' }}>{w.name}</span>
                <span style={{ flex: 1, minWidth: 60 }}><Bar pct={w.pct} tip={`${w.done} of ${w.total} done · ${w.open} open${w.late ? ` · ${w.late} overdue` : ''}`} /></span>
                <span style={{ width: 42, textAlign: 'right', fontWeight: 600, fontSize: 13 }}>{Math.round(w.pct)}%</span>
                <span className={w.late ? 'c3-days late' : 'c3-muted'} style={{ width: 64, textAlign: 'right', fontSize: 12 }}>{w.late ? `${w.late} late` : `${w.open} open`}</span>
              </Link>
            ))}
          </div>
          <div className="c3-pill-note">
            <span className="c3-pill-ico"><TrendingUp size={16} /></span>
            <span><b>{Math.round(s.progress)}%</b> ({s.done}/{s.total}) overall progress</span>
          </div>
        </Card>

        <div className="c3-grid" style={{ alignContent: 'start' }}>
          <Card>
            <CardHead title="Task status" sub={`${s.total} tasks across ${d.teams.length} teams`} href={`${BASE}/board`} />
            <div style={{ display: 'flex', gap: 2, height: 14, borderRadius: 999, overflow: 'hidden', background: '#fff' }}>
              {TASK_STATUSES.map((st) => {
                const n = st === 'Done' ? s.done : st === 'In Progress' ? s.inProg : st === 'Blocked' ? s.blockedN : s.notStarted
                return n ? <span key={st} data-tip={`${STATUS_STYLE[st].label}: ${n}`} style={{ flex: n, background: STATUS_STYLE[st].dot, borderRadius: 4 }} /> : null
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginTop: 16 }}>
              {TASK_STATUSES.map((st) => {
                const n = st === 'Done' ? s.done : st === 'In Progress' ? s.inProg : st === 'Blocked' ? s.blockedN : s.notStarted
                return (
                  <Link key={st} href={`${BASE}/tasks?status=${encodeURIComponent(st)}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none', fontSize: 14 }}>
                    <span className="c3-dot" style={{ background: STATUS_STYLE[st].dot, width: 9, height: 9 }} />
                    <span style={{ flex: 1 }}>{STATUS_STYLE[st].label}</span><b>{n}</b>
                  </Link>
                )
              })}
            </div>
          </Card>
          <Card>
            <CardHead title={s.week ? `This week · ${s.week.week}` : 'This week'} sub={s.week?.dates || undefined} href={`${BASE}/plan`} />
            {s.week ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>{s.week.focus}</div>
                {s.week.also && <p className="c3-sub" style={{ marginTop: 8 }}>Also running: {s.week.also}</p>}
                {s.week.gate && s.week.gate !== '-' && <div className="c3-chip" style={{ marginTop: 12, background: '#F2F2F7', color: '#1D1D1F' }}><Flag size={13} /> {s.week.gate}</div>}
              </>
            ) : <Empty text="No week planned for today." />}
          </Card>
        </div>
      </div>

      {/* deadlines table */}
      <Card>
        <CardHead
          title="Upcoming deadlines"
          info="Tick the circle to mark a task done. Click a row to open it."
          action={<Segmented value={tab} onChange={setTab} options={[
            { value: 'overdue', label: <>Overdue <b>{s.overdue.length}</b></> },
            { value: 'soon', label: <>Next 14 days <b>{s.soon.length}</b></> },
            { value: 'blocked', label: <>Blocked <b>{s.blocked.length}</b></> },
          ]} />}
        />
        {rows.length === 0 ? <Empty text={tab === 'overdue' ? 'Nothing overdue. Nice.' : tab === 'soon' ? 'No deadlines in the next two weeks.' : 'Nothing is blocked.'} /> : (
          <div className="c3-table-wrap" style={{ maxHeight: 460 }}>
            <table className="c3-table">
              <thead><tr><th style={{ width: 40 }} /><th>ID</th><th>Task</th><th>Team</th><th>Owner</th><th>Deadline</th><th>Status</th></tr></thead>
              <tbody>
                {rows.slice(0, 40).map((t) => (
                  <tr key={t.id} onClick={() => openTask(t.id)}>
                    <td>
                      <button className={`c3-check done ${t.status === 'Done' ? 'on' : ''}`} aria-label={`Mark ${t.code} done`}
                        onClick={(e) => { e.stopPropagation(); save('tasks', { id: t.id, status: t.status === 'Done' ? 'In Progress' : 'Done' }) }}>
                        {t.status === 'Done' && <Check size={13} strokeWidth={3} />}
                      </button>
                    </td>
                    <td><div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}><span className="c3-id">#{t.code}</span><PriorityChip p={t.priority} /></div></td>
                    <td><div className="c3-task-title" data-tip={t.why || undefined}>{t.title}</div></td>
                    <td style={{ whiteSpace: 'nowrap' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{t.team && <Tile label={teamTag(t.team)} k={t.team} size={22} />}{t.team ? teamShort(t.team) : '—'}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Avatar name={t.owner} size={24} /><span className={t.owner ? '' : 'c3-muted'}>{t.owner ? t.owner.split(/\s+/)[0] : 'Unassigned'}</span></span></td>
                    <td style={{ whiteSpace: 'nowrap' }}><div>{fmtDate(t.deadline)}</div><div style={{ fontSize: 12 }}><DaysBadge days={daysLeft(t.deadline)} done={t.status === 'Done'} /></div></td>
                    <td><StatusSelect compact value={t.status} onChange={(v) => save('tasks', { id: t.id, status: v })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* gates + teams */}
      <div className="c3-grid c3-g2">
        <Card>
          <CardHead title="Critical path" sub={nextGate ? `Next gate: ${nextGate.title}, ${fmtDate(nextGate.date)}` : 'Every gate is done'} href={`${BASE}/gates`} />
          <div style={{ position: 'relative' }}>
            {s.gates.map((g, i) => {
              const late = g.status !== 'Done' && g.date && g.date < today
              const st = STATUS_STYLE[g.status]
              return (
                <div key={g.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: i === s.gates.length - 1 ? 0 : 12, position: 'relative' }}>
                  {i < s.gates.length - 1 && <span style={{ position: 'absolute', left: 13, top: 28, bottom: 0, width: 2, background: '#EDEDF0' }} />}
                  <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, zIndex: 1,
                    background: g.status === 'Done' ? st.dot : '#fff', color: g.status === 'Done' ? '#fff' : late ? '#B42318' : '#1D1D1F',
                    border: `2px solid ${g.status === 'Done' ? st.dot : late ? '#D03B3B' : g.id === nextGate?.id ? '#1D1D1F' : '#D1D1D6'}` }}>
                    {g.status === 'Done' ? <Check size={14} strokeWidth={3} /> : g.n}
                  </span>
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
                    <div style={{ fontSize: 14, fontWeight: g.id === nextGate?.id ? 700 : 500, lineHeight: 1.35 }}>{g.title}</div>
                    <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="c3-muted">{fmtDate(g.date)}</span>
                      {g.status !== 'Done' && <DaysBadge days={daysLeft(g.date)} />}
                    </div>
                  </div>
                  <StatusChip status={g.status} small />
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <CardHead title="Teams" sub="Open tasks, next deadline and staffing checks" href={`${BASE}/teams`} />
          <div className="c3-rows">
            {s.teams.map((t) => (
              <Link key={t.id} href={`${BASE}/tasks?team=${encodeURIComponent(t.name)}`} className="c3-row" style={{ alignItems: 'flex-start' }}>
                <Tile label={teamTag(t.name)} k={t.name} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{teamShort(t.name)}</div>
                  <div className="c3-sub" style={{ marginTop: 0 }}>
                    {t.head || 'No head'}{t.deputy ? ` · ${t.deputy}` : ''}
                    {t.check && <span style={{ color: '#B42318', fontWeight: 600 }}> · {t.check}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.open} open <span className="c3-muted" style={{ fontWeight: 500 }}>· {t.done} done</span></div>
                  <div style={{ fontSize: 12 }}>{t.next ? <><span className="c3-muted">next </span><DaysBadge days={daysLeft(t.next.deadline)} /></> : <span className="c3-muted">nothing due</span>}</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* sponsorship, risks, activity */}
      <div className="c3-grid c3-g3">
        <Card>
          <CardHead title="Sponsorship" sub={`${d.sponsors.length} companies in the pipeline`} href={`${BASE}/sponsors`} />
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em' }}>{lkr(s.confirmed)}</div>
          <div className="c3-sub">confirmed of {lkr(s.target)}</div>
          <div style={{ marginTop: 12 }}><Bar pct={s.target ? (s.confirmed / s.target) * 100 : 0} height={10} tip={`${s.target ? Math.round((s.confirmed / s.target) * 100) : 0}% of target`} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14, fontSize: 13 }}>
            <div><div className="c3-muted">Cash received</div><b>{lkr(s.received)}</b></div>
            <div><div className="c3-muted">Gap to close</div><b>{lkr(Math.max(0, s.target - s.confirmed))}</b></div>
            <div><div className="c3-muted">Proposals out</div><b>{s.spByStatus['Proposal Sent'] || 0}</b></div>
            <div><div className="c3-muted">Follow-ups due</div><b style={{ color: s.followups ? '#B42318' : undefined }}>{s.followups}</b></div>
          </div>
        </Card>

        <Card>
          <CardHead title="Risks to decide" sub="Decision dates in the next 14 days" href={`${BASE}/risks`} />
          {s.risks.length === 0 ? <Empty text="No risk decisions due soon." /> : (
            <div className="c3-rows">
              {s.risks.slice(0, 5).map((r) => (
                <Link key={r.id} href={`${BASE}/risks`} className="c3-row" style={{ alignItems: 'flex-start' }}>
                  <span className="c3-tile" style={{ width: 26, height: 26, background: r.impact === 'Critical' ? '#FDECEC' : '#F2F2F7', color: r.impact === 'Critical' ? '#B42318' : '#48484A', fontSize: 12 }}>{r.n}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.35 }}>{r.risk}</div>
                    <div className="c3-sub" style={{ marginTop: 0 }}>{r.owner} · {r.impact} impact</div>
                  </div>
                  <DaysBadge days={daysLeft(r.decide_by)} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHead title="Recent activity" sub="Every change is recorded" />
          {d.log.length === 0 ? <Empty text="Changes made in the workspace will show here." /> : (
            <div style={{ maxHeight: 340, overflowY: 'auto', marginTop: -10 }}>
              {d.log.slice(0, 12).map((l) => (
                <div key={l.id} onClick={() => l.task_id && openTask(l.task_id)} style={{ cursor: l.task_id ? 'pointer' : 'default' }}><LogLine l={l} withCode /></div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
