'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, Plus, Download, Upload, Check, ArrowUpDown, X, StickyNote } from 'lucide-react'
import { useC360 } from '../_c360/context'
import { Card, Tile, Avatar, Bar, DaysBadge, StatusSelect, PriorityChip, Empty } from '../_c360/ui'
import {
  TASK_STATUSES, PRIORITIES, STATUS_STYLE, daysLeft, isOverdue, taskPct, fmtDate, teamTag, teamShort, ownerIncludes, addDays, todayISO,
  type Task,
} from '@/lib/c360'

type SortKey = 'deadline' | 'code' | 'priority' | 'status' | 'team' | 'owner' | 'pct' | 'start_date'
const STATUS_ORDER: Record<string, number> = { Blocked: 0, 'In Progress': 1, 'Not Started': 2, Done: 3 }

function Th({ k, sort, onSort, children }: { k: SortKey; sort: { k: SortKey; asc: boolean }; onSort: (k: SortKey) => void; children: React.ReactNode }) {
  return (
    <th aria-sort={sort.k === k ? (sort.asc ? 'ascending' : 'descending') : undefined}>
      <button onClick={() => onSort(k)}>{children}<ArrowUpDown size={12} style={{ opacity: sort.k === k ? 1 : .35 }} /></button>
    </th>
  )
}

export default function TasksPage() {
  const { data, openTask, save, bulkTasks, importTasks, toast } = useC360()
  const d = data!
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState('open')
  const [priority, setPriority] = useState('')
  const [team, setTeam] = useState('')
  const [ws, setWs] = useState('')
  const [owner, setOwner] = useState('')
  const [mine, setMine] = useState(false)
  const [overdue, setOverdue] = useState(false)
  const [group, setGroup] = useState<'none' | 'team' | 'workstream' | 'status' | 'owner'>('none')
  const [sort, setSort] = useState<{ k: SortKey; asc: boolean }>({ k: 'deadline', asc: true })
  const [sel, setSel] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  // URL → filters (sidebar links, dashboard links)
  useEffect(() => {
    setQ(params.get('q') || '')
    setTeam(params.get('team') || '')
    setWs(params.get('ws') || '')
    setMine(params.get('mine') === '1')
    const st = params.get('status')
    setStatus(st ? st : params.get('q') ? 'all' : 'open')
    setOverdue(params.get('overdue') === '1')
    setSel(new Set())
  }, [params])

  const setMineUrl = (v: boolean) => {
    const p = new URLSearchParams(params.toString())
    if (v) p.set('mine', '1'); else p.delete('mine')
    router.replace(`${pathname}${p.toString() ? `?${p}` : ''}`)
  }

  const workstreams = useMemo(() => [...new Set(d.tasks.map((t) => t.workstream).filter(Boolean))].sort() as string[], [d.tasks])
  const teams = useMemo(() => [...new Set([...d.teams.map((t) => t.name), ...d.tasks.map((t) => t.team).filter(Boolean)])] as string[], [d])
  const owners = useMemo(() => [...new Set([...d.people.map((p) => p.name), ...d.tasks.map((t) => t.owner).filter(Boolean)])].sort() as string[], [d])

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase()
    let l = d.tasks.filter((t) => {
      if (status === 'open' && t.status === 'Done') return false
      if (status !== 'open' && status !== 'all' && t.status !== status) return false
      if (priority && t.priority !== priority) return false
      if (team && t.team !== team) return false
      if (ws && t.workstream !== ws) return false
      if (owner === '__none' && t.owner) return false
      if (owner && owner !== '__none' && !ownerIncludes(t.owner, owner)) return false
      if (mine && !ownerIncludes(t.owner, d.me.name)) return false
      if (overdue && !isOverdue(t)) return false
      if (qq && ![t.code, t.title, t.why, t.notes, t.owner, t.team, t.workstream].some((x) => x && x.toLowerCase().includes(qq))) return false
      return true
    })
    const dir = sort.asc ? 1 : -1
    const val = (t: Task): string | number => {
      switch (sort.k) {
        case 'deadline': return t.deadline || '9999'
        case 'start_date': return t.start_date || '9999'
        case 'status': return STATUS_ORDER[t.status]
        case 'pct': return taskPct(t)
        case 'owner': return (t.owner || '~').toLowerCase()
        case 'team': return (t.team || '~').toLowerCase()
        default: return String(t[sort.k] || '')
      }
    }
    l = [...l].sort((a, b) => { const x = val(a), y = val(b); return x < y ? -dir : x > y ? dir : a.sort - b.sort })
    return l
  }, [d, q, status, priority, team, ws, owner, mine, overdue, sort])

  const groups = useMemo(() => {
    if (group === 'none') return [{ key: '', items: list }]
    const m = new Map<string, Task[]>()
    for (const t of list) {
      const k = group === 'owner' ? (t.owner || 'Unassigned') : group === 'status' ? STATUS_STYLE[t.status].label : (t[group] || 'None')
      m.set(k, [...(m.get(k) || []), t])
    }
    const keys = [...m.keys()]
    if (group === 'status') keys.sort((a, b) => STATUS_ORDER[Object.keys(STATUS_STYLE).find((s) => STATUS_STYLE[s].label === a)!] - STATUS_ORDER[Object.keys(STATUS_STYLE).find((s) => STATUS_STYLE[s].label === b)!])
    else if (group === 'team') keys.sort((a, b) => teams.indexOf(a) - teams.indexOf(b))
    else keys.sort()
    return keys.map((k) => ({ key: k, items: m.get(k)! }))
  }, [list, group, teams])

  const allSel = list.length > 0 && list.every((t) => sel.has(t.id))
  const toggleSel = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const sortBy = (k: SortKey) => setSort((s) => ({ k, asc: s.k === k ? !s.asc : true }))

  async function bulk(patch: Partial<Task>, label: string) {
    const ids = [...sel]
    if (!ids.length) return
    if (await bulkTasks(ids, patch)) { toast('ok', `${label} for ${ids.length} task${ids.length > 1 ? 's' : ''}.`); setSel(new Set()) }
  }
  async function shiftDeadlines() {
    const n = Number(prompt('Move the deadlines of the selected tasks by how many days? Use a minus for earlier, e.g. 3 or -2.', '7'))
    if (!Number.isFinite(n) || n === 0) return
    const tasks = d.tasks.filter((t) => sel.has(t.id) && t.deadline)
    let ok = 0
    for (const t of tasks) if (await save('tasks', { id: t.id, deadline: addDays(t.deadline!, Math.round(n)) })) ok++
    toast('ok', `Moved ${ok} deadline${ok === 1 ? '' : 's'} by ${n} day${Math.abs(n) === 1 ? '' : 's'}.`)
    setSel(new Set())
  }

  async function exportXlsx() {
    const XLSX = await import('xlsx')
    const rows = list.map((t) => ({
      ID: t.code, Priority: t.priority, Workstream: t.workstream || '', Team: t.team || '', Task: t.title, 'Why it matters / what it blocks': t.why || '',
      Start: t.start_date || '', Deadline: t.deadline || '', 'Days Left': t.status === 'Done' ? '' : daysLeft(t.deadline) ?? '',
      Status: t.status, '% Done': taskPct(t) / 100, 'Person Responsible': t.owner || '', 'Notes / Blocker': t.notes || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [8, 8, 14, 16, 60, 50, 11, 11, 9, 12, 8, 22, 40].map((w) => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Master Tracker')
    XLSX.writeFile(wb, `COMMERCE_360_Tasks_${todayISO()}.xlsx`)
  }

  async function onImport(file: File) {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const sheet = wb.Sheets['Master Tracker'] || wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true })
    const pick = (r: Record<string, unknown>, ...names: string[]) => {
      for (const n of names) { const k = Object.keys(r).find((x) => x.trim().toLowerCase() === n.toLowerCase()); if (k && r[k] !== null && r[k] !== '') return r[k] }
      return null
    }
    const date = (v: unknown) => {
      if (v === null || v === undefined || v === '') return null
      if (typeof v === 'number') return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000).toISOString().slice(0, 10)
      const s = String(v).trim()
      return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null
    }
    const rows = raw.map((r) => {
      const pct = pick(r, '% Done', 'Pct', '%')
      const row: Record<string, unknown> = {
        code: pick(r, 'ID', 'Code'), priority: pick(r, 'Priority'), workstream: pick(r, 'Workstream'), team: pick(r, 'Team'),
        title: pick(r, 'Task', 'Title'), why: pick(r, 'Why it matters / what it blocks', 'Why'), start_date: date(pick(r, 'Start')),
        deadline: date(pick(r, 'Deadline')), status: pick(r, 'Status'), owner: pick(r, 'Person Responsible', 'Owner'), notes: pick(r, 'Notes / Blocker', 'Notes'),
      }
      if (pct !== null) row.pct = Number(pct) <= 1 ? Math.round(Number(pct) * 100) : Number(pct)
      for (const k of Object.keys(row)) if (row[k] === null) delete row[k]
      return row
    }).filter((r) => r.code)
    if (!rows.length) { toast('err', 'No rows with an ID column were found in that file.'); return }
    if (!confirm(`Import ${rows.length} tasks from ${file.name}?\n\nTasks are matched by ID. Matching tasks are updated with the file's values, new IDs are added, and nothing is deleted. Every change is recorded in each task's activity.`)) return
    const r = await importTasks(rows)
    if (r) toast(r.errors.length ? 'err' : 'ok', `Import done: ${r.added} added, ${r.updated} updated, ${r.unchanged} unchanged.${r.errors.length ? ` ${r.errors.length} skipped: ${r.errors[0]}` : ''}`)
  }

  const filtersOn = !!(q || status !== 'open' || priority || team || ws || owner || mine || overdue)
  const title = mine ? 'My Tasks' : team ? teamShort(team) : ws ? ws : 'All Tasks'
  const doneCount = list.filter((t) => t.status === 'Done').length

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="c3-greet" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{team && <Tile label={teamTag(team)} k={team} size={36} />}{title}</h1>
          <p className="c3-lead">{list.length} task{list.length === 1 ? '' : 's'}{doneCount ? ` · ${doneCount} done` : ''}{mine ? ` assigned to ${d.me.name}` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="c3-btn" onClick={exportXlsx}><Download size={15} /> Export</button>
          {d.me.can.admin && <>
            <button className="c3-btn" onClick={() => fileRef.current?.click()}><Upload size={15} /> Import</button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = '' }} />
          </>}
          <button className="c3-btn dark" onClick={() => openTask(null, { team: team || undefined, workstream: ws || undefined, owner: mine ? d.me.name : undefined })}><Plus size={16} /> New task</button>
        </div>
      </div>

      <Card style={{ padding: 14 }}>
        <div className="c3-toolbar">
          <div className="c3-tsearch">
            <Search size={16} />
            <input className="c3-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, task, notes, owner" aria-label="Search tasks" />
          </div>
          <select className="c3-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="open">Open tasks</option><option value="all">All statuses</option>
            {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
          </select>
          <select className="c3-select" value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Team">
            <option value="">All teams</option>{teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="c3-select" value={ws} onChange={(e) => setWs(e.target.value)} aria-label="Workstream">
            <option value="">All workstreams</option>{workstreams.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          <select className="c3-select" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Person">
            <option value="">Anyone</option><option value="__none">Unassigned</option>{owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className="c3-select" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
            <option value="">Any priority</option>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className={`c3-toggle ${mine ? 'on' : ''}`} onClick={() => setMineUrl(!mine)}>Mine</button>
          <button className={`c3-toggle ${overdue ? 'on' : ''}`} onClick={() => setOverdue((v) => !v)}>Overdue</button>
          <select className="c3-select" value={group} onChange={(e) => setGroup(e.target.value as typeof group)} aria-label="Group by">
            <option value="none">No grouping</option><option value="team">Group by team</option><option value="workstream">Group by workstream</option>
            <option value="status">Group by status</option><option value="owner">Group by person</option>
          </select>
          {filtersOn && <button className="c3-btn" style={{ height: 36 }} onClick={() => router.replace(pathname)}><X size={14} /> Clear</button>}
        </div>
      </Card>

      {sel.size > 0 && (
        <Card style={{ padding: 12, position: 'sticky', top: 8, zIndex: 20, background: '#1D1D1F', color: '#fff', borderColor: '#1D1D1F' }}>
          <div className="c3-toolbar">
            <b style={{ marginRight: 4 }}>{sel.size} selected</b>
            <select className="c3-select" value="" onChange={(e) => e.target.value && bulk({ status: e.target.value as Task['status'] }, 'Status changed')} aria-label="Set status">
              <option value="">Set status…</option>{TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
            </select>
            <select className="c3-select" value="" onChange={(e) => e.target.value && bulk({ owner: e.target.value === '__none' ? null : e.target.value }, 'Owner changed')} aria-label="Assign">
              <option value="">Assign to…</option><option value="__none">Nobody</option>{d.people.filter((p) => p.active).map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            <select className="c3-select" value="" onChange={(e) => e.target.value && bulk({ team: e.target.value }, 'Team changed')} aria-label="Move to team">
              <option value="">Move to team…</option>{teams.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="c3-select" value="" onChange={(e) => e.target.value && bulk({ priority: e.target.value }, 'Priority changed')} aria-label="Set priority">
              <option value="">Priority…</option>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button className="c3-btn" style={{ height: 36 }} onClick={shiftDeadlines}>Move deadlines…</button>
            <button className="c3-btn" style={{ height: 36, marginLeft: 'auto' }} onClick={() => setSel(new Set())}>Done</button>
          </div>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {list.length === 0 ? <Empty text={filtersOn ? 'No tasks match these filters.' : 'No tasks yet. Add the first one.'} /> : (
          <div className="c3-table-wrap" style={{ border: 'none', borderRadius: 0, maxHeight: 'calc(100vh - 260px)' }}>
            <table className="c3-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}><button className={`c3-check ${allSel ? 'on' : ''}`} aria-label="Select all" onClick={() => setSel(allSel ? new Set() : new Set(list.map((t) => t.id)))}>{allSel && <Check size={13} strokeWidth={3} />}</button></th>
                  <th style={{ width: 36 }} />
                  <Th k="code" sort={sort} onSort={sortBy}>ID</Th><th>Task</th><Th k="team" sort={sort} onSort={sortBy}>Team</Th><Th k="owner" sort={sort} onSort={sortBy}>Owner</Th><Th k="deadline" sort={sort} onSort={sortBy}>Deadline</Th>
                  <Th k="status" sort={sort} onSort={sortBy}>Status</Th><Th k="pct" sort={sort} onSort={sortBy}>Progress</Th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <React.Fragment key={g.key || 'all'}>
                    {g.key && (
                      <tr style={{ cursor: 'default' }}>
                        <td colSpan={9} style={{ background: '#FAFAFB', fontWeight: 700, fontSize: 13, padding: '10px 12px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            {group === 'team' && g.key !== 'None' && <Tile label={teamTag(g.key)} k={g.key} size={22} />}
                            {group === 'owner' && <Avatar name={g.key === 'Unassigned' ? null : g.key} size={22} />}
                            {g.key} <span className="c3-muted" style={{ fontWeight: 500 }}>· {g.items.length}</span>
                          </span>
                        </td>
                      </tr>
                    )}
                    {g.items.map((t) => (
                      <tr key={t.id} className={sel.has(t.id) ? 'sel' : ''} onClick={() => openTask(t.id)}>
                        <td><button className={`c3-check ${sel.has(t.id) ? 'on' : ''}`} aria-label={`Select ${t.code}`} onClick={(e) => { e.stopPropagation(); toggleSel(t.id) }}>{sel.has(t.id) && <Check size={13} strokeWidth={3} />}</button></td>
                        <td>
                          <button className={`c3-check done ${t.status === 'Done' ? 'on' : ''}`} aria-label={`Mark ${t.code} ${t.status === 'Done' ? 'not done' : 'done'}`} data-tip={t.status === 'Done' ? 'Mark not done' : 'Mark done'}
                            onClick={(e) => { e.stopPropagation(); save('tasks', { id: t.id, status: t.status === 'Done' ? 'In Progress' : 'Done' }) }}>
                            {t.status === 'Done' && <Check size={13} strokeWidth={3} />}
                          </button>
                        </td>
                        <td><div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}><span className="c3-id">#{t.code}</span><PriorityChip p={t.priority} /></div></td>
                        <td style={{ maxWidth: 420 }}>
                          <div className="c3-task-title" style={{ textDecoration: t.status === 'Done' ? 'line-through' : undefined, color: t.status === 'Done' ? '#8E8E93' : undefined }}>{t.title}</div>
                          <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                            {t.workstream}
                            {t.notes && <span data-tip={t.notes} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><StickyNote size={12} /> note</span>}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{t.team ? <><Tile label={teamTag(t.team)} k={t.team} size={22} />{teamShort(t.team)}</> : <span className="c3-muted">—</span>}</span></td>
                        <td style={{ whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Avatar name={t.owner} size={24} /><span className={t.owner ? '' : 'c3-muted'}>{t.owner || 'Unassigned'}</span></span></td>
                        <td style={{ whiteSpace: 'nowrap' }}><div>{fmtDate(t.deadline)}</div><div style={{ fontSize: 12 }}><DaysBadge days={daysLeft(t.deadline)} done={t.status === 'Done'} /></div></td>
                        <td><StatusSelect compact value={t.status} onChange={(v) => save('tasks', { id: t.id, status: v })} /></td>
                        <td style={{ minWidth: 110 }}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Bar pct={taskPct(t)} color={t.status === 'Done' ? STATUS_STYLE.Done.dot : '#1D1D1F'} /><span style={{ fontSize: 12, fontWeight: 600, width: 32 }}>{taskPct(t)}%</span></span></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
