'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, TriangleAlert, BookOpen, Settings2 } from 'lucide-react'
import { useC360 } from '../_c360/context'
import { Card, CardHead, Tile, Avatar, Bar, DaysBadge, Empty } from '../_c360/ui'
import RecordSheet, { type FieldDef } from '../_c360/RecordSheet'
import { isOverdue, taskPct, daysLeft, teamTag, teamShort, ownerIncludes, fmtDate, type Team, type Person } from '@/lib/c360'

export default function TeamsPage() {
  const { data } = useC360()
  const d = data!
  const [editTeam, setEditTeam] = useState<Team | 'new' | null>(null)
  const [editPerson, setEditPerson] = useState<Person | 'new' | null>(null)
  const [editSettings, setEditSettings] = useState(false)
  const names = d.people.map((p) => p.name)

  const TEAM_FIELDS: FieldDef[] = [
    { key: 'name', label: 'Team name', hint: 'Tasks are linked to a team by this name, so renaming here does not move existing tasks.' },
    { key: 'sort', label: 'Order', type: 'int' },
    { key: 'head', label: 'Head', type: 'list', options: names },
    { key: 'deputy', label: 'Deputy', type: 'list', options: names },
    { key: 'members', label: 'Members', span: true, placeholder: 'Names, or how many are needed' },
    { key: 'scope', label: 'Scope', type: 'long' },
  ]
  const PERSON_FIELDS: FieldDef[] = [
    { key: 'name', label: 'Name' }, { key: 'role', label: 'Role', placeholder: 'Head T1, volunteer …' },
    { key: 'phone', label: 'Phone' }, { key: 'active', label: 'Active', type: 'bool', hint: 'Inactive people stay on old tasks but are not suggested.' },
  ]

  const teams = useMemo(() => {
    const workHeads = d.teams.filter((t) => /^T\d+/.test(t.name)).map((t) => t.head).filter(Boolean)
    return d.teams.map((t) => {
      const list = d.tasks.filter((x) => x.team === t.name)
      const open = list.filter((x) => x.status !== 'Done')
      const next = open.filter((x) => x.deadline).sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))[0]
      const clash = /^T\d+/.test(t.name) && t.head && workHeads.filter((h) => h === t.head).length > 1
      const check = !t.head ? 'Head not set' : clash ? `${t.head} heads two workstream teams` : !t.deputy ? 'Deputy not set' : ''
      return { t, total: list.length, open: open.length, done: list.length - open.length, late: list.filter(isOverdue).length, blocked: list.filter((x) => x.status === 'Blocked').length,
        pct: list.length ? list.reduce((n, x) => n + taskPct(x), 0) / list.length : 0, next, check }
    })
  }, [d])

  const people = useMemo(() => [...d.people].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)).map((p) => {
    const tasks = d.tasks.filter((t) => ownerIncludes(t.owner, p.name))
    return { p, open: tasks.filter((t) => t.status !== 'Done').length, late: tasks.filter(isOverdue).length, heads: d.teams.filter((t) => t.head === p.name).map((t) => teamTag(t.name)), deputy: d.teams.filter((t) => t.deputy === p.name).map((t) => teamTag(t.name)) }
  }), [d])
  const unassigned = d.tasks.filter((t) => t.status !== 'Done' && !t.owner).length

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="c3-greet">Teams</h1>
          <p className="c3-lead">Function based teams, each with a head and a deputy so one absence does not stall a workstream.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {d.me.can.admin && <button className="c3-btn" onClick={() => setEditSettings(true)}><Settings2 size={15} /> Event settings</button>}
          <button className="c3-btn dark" onClick={() => setEditTeam('new')}><Plus size={16} /> Add team</button>
        </div>
      </div>

      <div className="c3-grid c3-g3">
        {teams.map(({ t, total, open, done, late, blocked, pct, next, check }) => (
          <Card key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Tile label={teamTag(t.name)} k={t.name} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{teamShort(t.name)}</div>
                <div className="c3-sub" style={{ marginTop: 0 }}>{t.members || `${total} tasks`}</div>
              </div>
              <button className="c3-icon-btn" onClick={() => setEditTeam(t)} aria-label={`Edit ${t.name}`}><Pencil size={15} /></button>
            </div>
            {t.scope && <p style={{ fontSize: 13, lineHeight: 1.45, color: '#48484A', margin: 0 }}>{t.scope}</p>}
            <div style={{ display: 'flex', gap: 16 }}>
              {[['Head', t.head], ['Deputy', t.deputy]].map(([l, n]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Avatar name={n || null} size={30} />
                  <div style={{ minWidth: 0 }}><div className="c3-label">{l}</div><div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n || <span className="c3-muted">Not set</span>}</div></div>
                </div>
              ))}
            </div>
            {check && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#B42318', background: '#FDECEC', padding: '6px 10px', borderRadius: 10 }}><TriangleAlert size={13} /> {check}</div>}
            <div style={{ marginTop: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>{done}/{total} done{late ? <span style={{ color: '#B42318', fontWeight: 600 }}> · {late} overdue</span> : ''}{blocked ? <span style={{ color: '#B42318', fontWeight: 600 }}> · {blocked} blocked</span> : ''}</span>
                <b>{Math.round(pct)}%</b>
              </div>
              <Bar pct={pct} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 13 }}>
                <span className="c3-muted">{next ? <>Next: {fmtDate(next.deadline)} <DaysBadge days={daysLeft(next.deadline)} /></> : 'Nothing due'}</span>
                <Link href={`/commerce360/tasks?team=${encodeURIComponent(t.name)}`} className="c3-link">{open} open tasks</Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="c3-grid c3-g2">
        <Card>
          <CardHead title="People" sub={`${d.people.filter((p) => p.active).length} active${unassigned ? ` · ${unassigned} open tasks have no owner` : ''}`}
            action={<button className="c3-btn" style={{ height: 34 }} onClick={() => setEditPerson('new')}><Plus size={14} /> Add person</button>} />
          {people.length === 0 ? <Empty text="Add the people who will own tasks." /> : (
            <div className="c3-rows">
              {people.map(({ p, open, late, heads, deputy }) => (
                <div key={p.id} className="c3-row" role="button" tabIndex={0} onClick={() => setEditPerson(p)} onKeyDown={(e) => { if (e.key === 'Enter') setEditPerson(p) }} style={{ opacity: p.active ? 1 : .5 }}>
                  <Avatar name={p.name} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</div>
                    <div className="c3-sub" style={{ marginTop: 0 }}>
                      {[p.role, heads.length ? `Head ${heads.join(', ')}` : '', deputy.length ? `Deputy ${deputy.join(', ')}` : ''].filter(Boolean).join(' · ') || (p.active ? 'Member' : 'Inactive')}
                    </div>
                  </div>
                  <Link href={`/commerce360/tasks?q=${encodeURIComponent(p.name.split(' ')[0])}`} onClick={(e) => e.stopPropagation()} className="c3-link" style={{ fontWeight: 500 }}>
                    {open} open{late ? <span style={{ color: '#B42318' }}>&nbsp;· {late} late</span> : ''}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHead title="How we work" sub={d.settings.review_rhythm ? `Weekly review: ${d.settings.review_rhythm}` : undefined}
            action={d.me.can.admin ? <button className="c3-icon-btn" onClick={() => setEditSettings(true)} aria-label="Edit"><Pencil size={15} /></button> : undefined} />
          {d.settings.playbook ? (
            <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {d.settings.playbook.split('\n').filter((l) => l.trim()).map((l, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.5 }}>
                  <BookOpen size={16} style={{ flexShrink: 0, marginTop: 2, color: '#6E6E73' }} />{l}
                </li>
              ))}
            </ol>
          ) : <Empty text="No ground rules written yet." />}
        </Card>
      </div>

      {editTeam && (
        <RecordSheet entity="teams" title={editTeam === 'new' ? 'New team' : editTeam.name} fields={TEAM_FIELDS} row={editTeam === 'new' ? null : editTeam}
          defaults={{ sort: Math.max(0, ...d.teams.map((t) => t.sort)) + 1 }} onClose={() => setEditTeam(null)} canDelete={d.me.can.delete} deleteLabel={editTeam === 'new' ? '' : editTeam.name} />
      )}
      {editPerson && (
        <RecordSheet entity="people" title={editPerson === 'new' ? 'Add person' : editPerson.name} fields={PERSON_FIELDS} row={editPerson === 'new' ? null : editPerson}
          defaults={{ active: true }} onClose={() => setEditPerson(null)} canDelete={d.me.can.delete} deleteLabel={editPerson === 'new' ? '' : editPerson.name} />
      )}
      {editSettings && (
        <RecordSheet entity="settings" title="Event settings" row={d.settings} onClose={() => setEditSettings(false)} fields={[
          { key: 'event_name', label: 'Event name' }, { key: 'event_date', label: 'Event date', type: 'date' },
          { key: 'venue', label: 'Venue' }, { key: 'budget_target', label: 'Budget target (Rs)', type: 'num' },
          { key: 'review_rhythm', label: 'Weekly review', span: true, placeholder: 'Sunday 8pm, 30 minutes, all heads' },
          { key: 'playbook', label: 'Ground rules (one per line)', type: 'long' },
        ]} />
      )}
    </>
  )
}
