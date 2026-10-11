// COMMERCE 360 project workspace: shared types, options and helpers.
// Safe to import in the browser and on the server.

export const C360_ROLES = ['chairman', 'deputy_chairman', 'cfo', 'marketing_manager', 'co_secretary', 'administration_manager'] as const

export const TASK_STATUSES = ['Not Started', 'In Progress', 'Blocked', 'Done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]
export const PRIORITIES = ['P1', 'P2', 'P3'] as const
export const SPONSOR_STATUSES = ['Not Contacted', 'Proposal Sent', 'Meeting Set', 'Negotiating', 'Verbal Yes', 'CONFIRMED', 'Paid', 'Declined', 'No Response'] as const
export const TIERS = ['Title', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Official Partner', 'In-Kind'] as const
export const LIKELIHOOD = ['Low', 'Medium', 'High'] as const
export const IMPACT = ['Low', 'Medium', 'High', 'Critical'] as const
export const RISK_STATUSES = ['Open', 'Watching', 'Triggered', 'Closed'] as const

export interface Task {
  id: string; code: string; priority: string; workstream: string; team: string; title: string; why: string | null
  start_date: string | null; deadline: string | null; status: TaskStatus; pct: number; owner: string | null; notes: string | null
  blocked_since: string | null; completed_at: string | null; sort: number
  created_at: string; updated_at: string; updated_by: string | null
}
export interface Gate { id: string; n: number; title: string; date: string | null; unlocks: string | null; slip: string | null; status: TaskStatus; updated_at: string }
export interface Team { id: string; name: string; scope: string | null; head: string | null; deputy: string | null; members: string | null; sort: number }
export interface Person { id: string; name: string; role: string | null; phone: string | null; active: boolean }
export interface Sponsor {
  id: string; n: number; company: string; category: string | null; tier: string | null; ask: number | null
  contact: string | null; designation: string | null; phone: string | null; email: string | null; intro: string | null
  first_contact: string | null; last_followup: string | null; next_action: string | null; status: string | null
  confirmed: number | null; received: number | null; owner: string | null; notes: string | null
}
export interface Week { id: string; week: string; dates: string | null; start_date: string | null; end_date: string | null; focus: string | null; also: string | null; gate: string | null }
export interface Risk {
  id: string; n: number; risk: string; likelihood: string | null; impact: string | null; warning: string | null
  response: string | null; owner: string | null; decide_by: string | null; status: string
}
export interface Settings { id: number; event_name: string; event_date: string; venue: string | null; budget_target: number; review_rhythm: string | null; playbook: string | null }
export interface LogEntry { id: number; task_id: string | null; task_code: string | null; action: string; changes: Record<string, [unknown, unknown]> | null; by_name: string | null; by_email: string | null; at: string }

export interface C360Me {
  email: string; name: string; role: string
  can: { edit: boolean; delete: boolean; admin: boolean }
}
export interface C360Data {
  tasks: Task[]; gates: Gate[]; teams: Team[]; people: Person[]; sponsors: Sponsor[]; weeks: Week[]; risks: Risk[]
  settings: Settings; log: LogEntry[]; me: C360Me
}

export type Entity = 'tasks' | 'gates' | 'teams' | 'people' | 'sponsors' | 'weeks' | 'risks' | 'settings'

// ── dates (all in Sri Lanka time) ──
export function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
}
const DAY = 86400000
export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((Date.parse(toISO + 'T00:00:00Z') - Date.parse(fromISO + 'T00:00:00Z')) / DAY)
}
export function daysLeft(dateISO: string | null): number | null {
  return dateISO ? daysBetween(todayISO(), dateISO) : null
}
export function isOverdue(t: Pick<Task, 'deadline' | 'status'>): boolean {
  const d = daysLeft(t.deadline)
  return d !== null && d < 0 && t.status !== 'Done'
}
export function fmtDate(iso: string | null, withYear = false): string {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' })
}
export function fmtDays(n: number | null): string {
  if (n === null) return '—'
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return '1 day late'
  return n < 0 ? `${-n} days late` : `${n} days`
}
export function addDays(iso: string, n: number): string {
  const d = new Date(Date.parse(iso + 'T00:00:00Z') + n * DAY)
  return d.toISOString().slice(0, 10)
}

export const lkr = (n: number | null | undefined) => `Rs ${Math.round(Number(n || 0)).toLocaleString('en-US')}`
export const lkrShort = (n: number) => (n >= 1e6 ? `Rs ${(n / 1e6).toFixed(n >= 1e7 ? 0 : 2).replace(/\.?0+$/, '')}M` : n >= 1e3 ? `Rs ${Math.round(n / 1e3)}K` : `Rs ${n}`)

/** Effective progress of a task: Done always counts as 100%. */
export const taskPct = (t: Pick<Task, 'status' | 'pct'>) => (t.status === 'Done' ? 100 : Math.max(0, Math.min(100, Number(t.pct) || 0)))

// ── visual tokens ──
// Status colours are reserved for state and always shown with a label.
export const STATUS_STYLE: Record<string, { dot: string; bg: string; fg: string; label: string }> = {
  'Not Started': { dot: '#AEAEB2', bg: '#F2F2F7', fg: '#48484A', label: 'Not started' },
  'In Progress': { dot: '#E5A00D', bg: '#FFF6E0', fg: '#8A5A00', label: 'In progress' },
  Blocked: { dot: '#D03B3B', bg: '#FDECEC', fg: '#B42318', label: 'Blocked' },
  Done: { dot: '#0CA30C', bg: '#E8F7E8', fg: '#1A7F1A', label: 'Done' },
}
export const PRIORITY_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  P1: { bg: '#1D1D1F', fg: '#FFFFFF', label: 'P1' },
  P2: { bg: '#E5E5EA', fg: '#1D1D1F', label: 'P2' },
  P3: { bg: '#F2F2F7', fg: '#6E6E73', label: 'P3' },
}
export const SPONSOR_DONE = ['CONFIRMED', 'Paid']
export const SPONSOR_LOST = ['Declined', 'No Response']

// Pastel letter tiles (identity is carried by the letter + name, never colour alone).
const TILES = [
  { bg: '#EFE9FF', fg: '#6E4BD8' }, { bg: '#FDE8F1', fg: '#C2367A' }, { bg: '#E6F6EC', fg: '#2F8A4C' },
  { bg: '#FFF4D6', fg: '#A06A00' }, { bg: '#E6EEFF', fg: '#3360C9' }, { bg: '#FFEBDD', fg: '#C25A12' },
  { bg: '#E3F5F6', fg: '#1F7F86' }, { bg: '#F2F2F7', fg: '#48484A' },
]
export function tileFor(key: string) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return TILES[h % TILES.length]
}
export function initials(name: string | null | undefined): string {
  const p = String(name || '').replace(/[^A-Za-z\s]/g, ' ').trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}
/** Short label for a team tile: "T1 Sponsorship" → "T1", "Chairman" → "C". */
export function teamTag(team: string): string {
  const m = /^T(\d+)\b/.exec(team)
  return m ? `T${m[1]}` : team.slice(0, 1).toUpperCase()
}
export function teamShort(team: string): string {
  return team.replace(/^T\d+\s+/, '')
}

/** Next free task code for a prefix, e.g. FIN → FIN-21. */
export function nextCode(tasks: Pick<Task, 'code'>[], prefix: string): string {
  const p = prefix.toUpperCase().replace(/[^A-Z]/g, '') || 'TSK'
  let max = 0
  for (const t of tasks) {
    const m = new RegExp(`^${p}-(\\d+)$`).exec(t.code)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${p}-${String(max + 1).padStart(2, '0')}`
}
/** Code prefixes already used per workstream (FIN for Finance, etc). */
export function prefixFor(tasks: Pick<Task, 'code' | 'workstream'>[], workstream: string): string {
  const t = tasks.find((x) => x.workstream === workstream && /^[A-Z]+-\d+$/.test(x.code))
  return t ? t.code.split('-')[0] : workstream.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()
}

/** Does this owner text include the person? ("Isira Chirayu and Vishmi" includes "Isira Chirayu"). */
export function ownerIncludes(owner: string | null, name: string): boolean {
  if (!owner || !name) return false
  const first = name.trim().split(/\s+/)[0].toLowerCase()
  const o = owner.toLowerCase()
  return o.includes(name.toLowerCase()) || new RegExp(`\\b${first.replace(/[^a-z]/g, '')}\\b`).test(o)
}
