import { NextRequest } from 'next/server'
import { svc, getCaller, type Caller } from '@/lib/rangeela-server'
import { C360_ROLES, C360_ADMIN_ROLES, TASK_STATUSES, PRIORITIES, SPONSOR_STATUSES, TIERS, LIKELIHOOD, IMPACT, RISK_STATUSES, type Entity, type C360Me } from '@/lib/c360'

/**
 * COMMERCE 360 server helpers. Every request is checked against the caller's
 * role in admin_users (service role, server side).
 *   view + edit: every board role
 *   delete, settings, import: chairman and public relations (C360_ADMIN_ROLES)
 */
export { svc }

export async function c360Caller(req: NextRequest): Promise<Caller | null> {
  const c = await getCaller(req)
  return c && (C360_ROLES as readonly string[]).includes(c.role) ? c : null
}
export function meFor(c: Caller): C360Me {
  const full = C360_ADMIN_ROLES.includes(c.role)
  return { email: c.email, name: c.name, role: c.role, can: { edit: true, delete: full, admin: full } }
}

type Kind = 'text' | 'long' | 'date' | 'int' | 'num' | 'pct' | 'bool' | { enum: readonly string[] }
interface Spec { table: string; fields: Record<string, Kind>; required: string[]; order: [string, boolean][]; adminOnly?: boolean }

export const SPECS: Record<Entity, Spec> = {
  tasks: {
    table: 'c360_tasks',
    fields: {
      code: 'text', priority: { enum: PRIORITIES }, workstream: 'text', team: 'text', title: 'long', why: 'long',
      start_date: 'date', deadline: 'date', status: { enum: TASK_STATUSES }, pct: 'pct', owner: 'text', notes: 'long', sort: 'int',
    },
    required: ['code', 'title'],
    order: [['deadline', true], ['sort', true]],
  },
  gates: {
    table: 'c360_gates',
    fields: { n: 'int', title: 'long', date: 'date', unlocks: 'long', slip: 'long', status: { enum: TASK_STATUSES } },
    required: ['title'],
    order: [['n', true]],
  },
  teams: {
    table: 'c360_teams',
    fields: { name: 'text', scope: 'long', head: 'text', deputy: 'text', members: 'text', sort: 'int' },
    required: ['name'],
    order: [['sort', true]],
  },
  people: {
    table: 'c360_people',
    fields: { name: 'text', role: 'text', phone: 'text', active: 'bool' },
    required: ['name'],
    order: [['name', true]],
  },
  sponsors: {
    table: 'c360_sponsors',
    fields: {
      n: 'int', company: 'text', category: 'text', tier: { enum: TIERS }, ask: 'num', contact: 'text', designation: 'text',
      phone: 'text', email: 'text', intro: 'text', first_contact: 'date', last_followup: 'date', next_action: 'date',
      status: { enum: SPONSOR_STATUSES }, confirmed: 'num', received: 'num', owner: 'text', notes: 'long',
    },
    required: ['company'],
    order: [['n', true]],
  },
  weeks: {
    table: 'c360_weeks',
    fields: { week: 'text', dates: 'text', start_date: 'date', end_date: 'date', focus: 'long', also: 'long', gate: 'text' },
    required: ['week'],
    order: [['start_date', true]],
  },
  risks: {
    table: 'c360_risks',
    fields: {
      n: 'int', risk: 'long', likelihood: { enum: LIKELIHOOD }, impact: { enum: IMPACT }, warning: 'long', response: 'long',
      owner: 'text', decide_by: 'date', status: { enum: RISK_STATUSES },
    },
    required: ['risk'],
    order: [['n', true]],
  },
  settings: {
    table: 'c360_settings',
    fields: { event_name: 'text', event_date: 'date', venue: 'text', budget_target: 'num', review_rhythm: 'text', playbook: 'long' },
    required: [],
    order: [['id', true]],
    adminOnly: true,
  },
}

export const ENTITIES = Object.keys(SPECS) as Entity[]

/** Keeps only known fields and coerces each to its type. Throws a readable message on bad input. */
export function clean(entity: Entity, body: Record<string, unknown>, partial: boolean): Record<string, unknown> {
  const spec = SPECS[entity]
  const out: Record<string, unknown> = {}
  for (const [k, kind] of Object.entries(spec.fields)) {
    if (!(k in body)) continue
    const raw = body[k]
    const blank = raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '')
    let v: unknown
    if (kind === 'text') v = blank ? null : String(raw).trim().slice(0, 300)
    else if (kind === 'long') v = blank ? null : String(raw).trim().slice(0, 4000)
    else if (kind === 'date') {
      if (blank) v = null
      else if (/^\d{4}-\d{2}-\d{2}$/.test(String(raw))) v = String(raw)
      else throw new Error(`${k}: use a valid date`)
    } else if (kind === 'int' || kind === 'num' || kind === 'pct') {
      if (blank) v = kind === 'pct' ? 0 : null
      else {
        const n = Number(String(raw).replace(/[, ]/g, ''))
        if (!Number.isFinite(n)) throw new Error(`${k}: enter a number`)
        v = kind === 'pct' ? Math.max(0, Math.min(100, Math.round(n))) : kind === 'int' ? Math.round(n) : n
      }
    } else if (kind === 'bool') v = raw === true || raw === 'true'
    else {
      if (blank) v = null
      else if (kind.enum.includes(String(raw))) v = String(raw)
      else throw new Error(`${k}: choose one of ${kind.enum.join(', ')}`)
    }
    out[k] = v
  }
  for (const r of spec.required) {
    const missing = out[r] === null || out[r] === undefined || out[r] === ''
    if (partial ? r in out && missing : missing) throw new Error(`${r} is required`)
  }
  return out
}

/** Keeps task status, % and blocked/completed stamps consistent. */
export function taskRules(next: Record<string, unknown>, prev?: Record<string, unknown>) {
  const now = new Date().toISOString()
  const status = (next.status ?? prev?.status) as string | undefined
  if ('status' in next && next.status === 'Done') next.pct = 100
  else if ('pct' in next && next.pct === 100 && status !== 'Done' && !('status' in next)) next.status = 'Done'
  const finalStatus = (next.status ?? prev?.status) as string | undefined
  if ('status' in next || 'pct' in next) {
    if (finalStatus === 'Blocked' && prev?.status !== 'Blocked') next.blocked_since = now
    if (finalStatus !== 'Blocked') next.blocked_since = null
    if (finalStatus === 'Done' && prev?.status !== 'Done') next.completed_at = now
    if (finalStatus !== 'Done') next.completed_at = null
  }
  return next
}

export async function logTask(c: Caller, action: string, task: { id?: string | null; code?: string | null }, changes: Record<string, [unknown, unknown]> | null) {
  await svc().from('c360_task_log').insert({
    task_id: action === 'deleted' ? null : task.id ?? null, task_code: task.code ?? null, action, changes,
    by_email: c.email, by_name: c.name,
  })
}

export function diff(prev: Record<string, unknown>, next: Record<string, unknown>) {
  const ch: Record<string, [unknown, unknown]> = {}
  for (const [k, v] of Object.entries(next)) {
    if (['blocked_since', 'completed_at', 'updated_at', 'updated_by'].includes(k)) continue
    const a = prev[k] ?? null, b = v ?? null
    if (String(a) !== String(b)) ch[k] = [a, b]
  }
  return ch
}
