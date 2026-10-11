'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Trash2, History, AlertTriangle } from 'lucide-react'
import { useC360 } from './context'
import { Sheet, Field, Avatar } from './ui'
import { c360Api } from '@/lib/c360-client'
import {
  TASK_STATUSES, PRIORITIES, STATUS_STYLE, nextCode, prefixFor, todayISO, fmtDate, daysLeft, fmtDays,
  type Task, type LogEntry,
} from '@/lib/c360'

const FIELD_LABEL: Record<string, string> = {
  code: 'ID', priority: 'Priority', workstream: 'Workstream', team: 'Team', title: 'Task', why: 'Why it matters',
  start_date: 'Start', deadline: 'Deadline', status: 'Status', pct: '% done', owner: 'Person responsible', notes: 'Notes / blocker', sort: 'Order',
}
const show = (k: string, v: unknown) => (v === null || v === undefined || v === '' ? '—' : k === 'pct' ? `${v}%` : /date|deadline/.test(k) ? fmtDate(String(v), true) : String(v))

export function LogLine({ l, withCode }: { l: LogEntry; withCode?: boolean }) {
  const when = new Date(l.at).toLocaleString('en-GB', { timeZone: 'Asia/Colombo', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  const entries = Object.entries(l.changes || {})
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: '1px solid #F2F2F4' }}>
      <Avatar name={l.by_name || l.by_email} size={28} />
      <div style={{ minWidth: 0, fontSize: 13, lineHeight: 1.45 }}>
        <div><b>{l.by_name || l.by_email || 'Someone'}</b> {l.action}{withCode && l.task_code ? <> <span className="c3-id">{l.task_code}</span></> : ' this task'}<span className="c3-muted"> · {when}</span></div>
        {l.action !== 'deleted' && entries.slice(0, 6).map(([k, [a, b]]) => (
          <div key={k} className="c3-muted" style={{ overflowWrap: 'anywhere' }}>
            {FIELD_LABEL[k] || k}: <s>{show(k, a)}</s> → <span style={{ color: '#1D1D1F' }}>{show(k, b)}</span>
          </div>
        ))}
        {l.action === 'deleted' && entries[0] && <div className="c3-muted">{String(entries[0][1][0] ?? '')}</div>}
      </div>
    </div>
  )
}

export default function TaskSheet() {
  const { data, taskOpen, closeTask, save, remove, toast } = useC360()
  const task = useMemo(() => (taskOpen?.id ? data?.tasks.find((t) => t.id === taskOpen.id) ?? null : null), [data, taskOpen])
  const isNew = !!taskOpen && !taskOpen.id
  const [f, setF] = useState<Partial<Task>>({})
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<LogEntry[] | null>(null)
  const [autoCode, setAutoCode] = useState(true)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    if (!taskOpen || !data) return
    if (task) { setF({ ...task }); setAutoCode(false) }
    else {
      const ws = taskOpen.defaults?.workstream || ''
      setF({
        status: 'Not Started', priority: 'P2', pct: 0, start_date: todayISO(), ...taskOpen.defaults,
        code: taskOpen.defaults?.code || (ws ? nextCode(data.tasks, prefixFor(data.tasks, ws)) : ''),
      })
      setAutoCode(true)
    }
    setLog(null)
    if (task) c360Api<{ log: LogEntry[] }>('GET', { entity: 'log', task: task.id }).then((r) => setLog(r.ok ? r.data.log : []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskOpen?.id, taskOpen?.defaults, task?.updated_at])

  if (!taskOpen || !data) return null
  const set = (k: keyof Task, v: unknown) => setF((p) => ({ ...p, [k]: v }))
  const workstreams = [...new Set(data.tasks.map((t) => t.workstream).filter(Boolean))].sort()
  const teams = [...new Set([...data.teams.map((t) => t.name), ...data.tasks.map((t) => t.team).filter(Boolean)])]
  const people = data.people.filter((p) => p.active).map((p) => p.name)
  const dl = daysLeft(f.deadline ?? null)

  function onWorkstream(v: string) {
    set('workstream', v)
    if (isNew && autoCode && v) set('code', nextCode(data!.tasks, prefixFor(data!.tasks, v)))
  }

  async function submit() {
    if (!f.title?.trim()) { toast('err', 'Write the task first.'); return }
    if (!f.code?.trim()) { toast('err', 'Give the task an ID, like FIN-21.'); return }
    if (f.start_date && f.deadline && f.deadline < f.start_date) { toast('err', 'The deadline is before the start date.'); return }
    setBusy(true)
    const payload: Record<string, unknown> = {
      code: f.code, priority: f.priority, workstream: f.workstream ?? null, team: f.team ?? null, title: f.title, why: f.why ?? null,
      start_date: f.start_date ?? null, deadline: f.deadline ?? null, status: f.status, pct: f.pct ?? 0, owner: f.owner ?? null, notes: f.notes ?? null,
    }
    if (task) payload.id = task.id
    else payload.sort = Math.max(0, ...data!.tasks.map((t) => t.sort || 0)) + 1
    const saved = await save<Task>('tasks', payload)
    setBusy(false)
    if (saved) { toast('ok', isNew ? `${saved.code} added.` : 'Saved.'); closeTask() }
  }

  const canDelete = data.me.can.delete && !!task

  return (
    <Sheet
      open
      onClose={closeTask}
      title={isNew ? 'New task' : task?.title || 'Task'}
      sub={task ? `${task.code} · ${task.team || 'No team'}${task.updated_by ? ` · last edit ${task.updated_by}` : ''}` : 'Add it to the COMMERCE 360 tracker'}
      footer={
        <>
          {canDelete && (
            <button className="c3-btn danger" style={{ marginRight: 'auto' }} onClick={async () => { if (await remove('tasks', task!.id, `${task!.code}`)) closeTask() }}>
              <Trash2 size={15} /> Delete
            </button>
          )}
          <button className="c3-btn" onClick={closeTask}>Cancel</button>
          <button className="c3-btn dark" onClick={submit} disabled={busy}>{busy ? 'Saving…' : isNew ? 'Add task' : 'Save changes'}</button>
        </>
      }
    >
      {task?.status === 'Blocked' && task.blocked_since && (now - Date.parse(task.blocked_since)) / 86400000 > 7 && (
        <div style={{ display: 'flex', gap: 8, padding: 12, borderRadius: 14, background: '#FDECEC', color: '#B42318', fontSize: 13, fontWeight: 600 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> Blocked for more than 7 days. Escalate to the chairman.
        </div>
      )}

      <div className="c3-form">
        <Field label="Task" span>
          <textarea className="c3-textarea" value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} rows={2} placeholder="What needs to happen" autoFocus={isNew} />
        </Field>
        <Field label="Status">
          <select className="c3-select" value={f.status} onChange={(e) => set('status', e.target.value)}>
            {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
          </select>
        </Field>
        <Field label={`% done · ${f.status === 'Done' ? 100 : f.pct ?? 0}%`}>
          <input type="range" min={0} max={100} step={5} value={f.status === 'Done' ? 100 : f.pct ?? 0} disabled={f.status === 'Done'}
            onChange={(e) => set('pct', Number(e.target.value))} style={{ height: 40, accentColor: '#1D1D1F' }} aria-label="Percent done" />
        </Field>
        <Field label="Person responsible">
          <input className="c3-input" list="c3-people" value={f.owner ?? ''} onChange={(e) => set('owner', e.target.value)} placeholder="Choose or type a name" />
          <datalist id="c3-people">{people.map((p) => <option key={p} value={p} />)}</datalist>
        </Field>
        <Field label="Team">
          <select className="c3-select" value={f.team ?? ''} onChange={(e) => set('team', e.target.value || null)}>
            <option value="">No team</option>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Start">
          <input type="date" className="c3-input" value={f.start_date ?? ''} onChange={(e) => set('start_date', e.target.value || null)} />
        </Field>
        <Field label="Deadline" hint={f.deadline && f.status !== 'Done' ? fmtDays(dl) + (dl !== null && dl >= 0 ? ' left' : '') : undefined}>
          <input type="date" className="c3-input" value={f.deadline ?? ''} onChange={(e) => set('deadline', e.target.value || null)} />
        </Field>
        <Field label="Priority">
          <select className="c3-select" value={f.priority} onChange={(e) => set('priority', e.target.value)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}{p === 'P1' ? ' · must happen' : p === 'P2' ? ' · important' : ' · nice to have'}</option>)}
          </select>
        </Field>
        <Field label="Workstream">
          <input className="c3-input" list="c3-ws" value={f.workstream ?? ''} onChange={(e) => onWorkstream(e.target.value)} placeholder="Finance, Venue …" />
          <datalist id="c3-ws">{workstreams.map((w) => <option key={w} value={w} />)}</datalist>
        </Field>
        <Field label="ID" hint={isNew ? 'Filled in from the workstream. You can change it.' : undefined}>
          <input className="c3-input" value={f.code ?? ''} onChange={(e) => { setAutoCode(false); set('code', e.target.value.toUpperCase()) }} placeholder="FIN-21" style={{ fontFamily: 'ui-monospace, SF Mono, Menlo, monospace' }} />
        </Field>
        <Field label="Why it matters / what it blocks" span>
          <textarea className="c3-textarea" value={f.why ?? ''} onChange={(e) => set('why', e.target.value)} rows={2} />
        </Field>
        <Field label="Notes / blocker" span>
          <textarea className="c3-textarea" value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="What is stuck, what you need from another team" />
        </Field>
      </div>

      {task && (
        <div>
          <div className="c3-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><History size={14} /> Activity</div>
          {log === null ? <div className="c3-muted" style={{ fontSize: 13 }}>Loading…</div>
            : log.length === 0 ? <div className="c3-muted" style={{ fontSize: 13 }}>No changes recorded yet. Changes made here are tracked from now on.</div>
            : log.map((l) => <LogLine key={l.id} l={l} />)}
          <div className="c3-muted" style={{ fontSize: 12, marginTop: 6 }}>Created {fmtDate(task.created_at.slice(0, 10), true)}{task.completed_at ? ` · done ${fmtDate(task.completed_at.slice(0, 10), true)}` : ''}</div>
        </div>
      )}
    </Sheet>
  )
}
