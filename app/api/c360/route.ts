import { NextRequest, NextResponse } from 'next/server'
import { svc, c360Caller, meFor, SPECS, ENTITIES, clean, taskRules, logTask, diff } from '@/lib/c360-server'
import type { Entity } from '@/lib/c360'

export const dynamic = 'force-dynamic'

// COMMERCE 360 workspace API.
//   GET    ?entity=all              everything the workspace needs + who am I
//   GET    ?entity=log&task=<id>    activity history (one task, or the latest overall)
//   POST   ?entity=<e>              create a row
//   POST   ?entity=import           upsert tasks by ID code (chairman)
//   PATCH  ?entity=<e>              update a row { id, ...fields }  (tasks also accept { ids, patch } for bulk)
//   DELETE ?entity=<e>&id=<id>      delete a row (chairman)

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const SETUP = 'COMMERCE 360 tables are not set up yet. Run supabase/commerce360.sql in Supabase first.'
const dbError = (e: { message: string; code?: string }) => {
  console.error('[c360]', e.message)
  if (e.code === '42P01' || /does not exist|schema cache/i.test(e.message)) return bad(SETUP, 500)
  if (e.code === '23505') return bad('That ID or name already exists. Use a different one.', 409)
  return bad('Database error. Please try again.', 500)
}

function entityOf(req: NextRequest): Entity | null {
  const e = req.nextUrl.searchParams.get('entity') as Entity
  return ENTITIES.includes(e) ? e : null
}

export async function GET(req: NextRequest) {
  const c = await c360Caller(req)
  if (!c) return bad('Not allowed', 403)
  const which = req.nextUrl.searchParams.get('entity')

  if (which === 'log') {
    const task = req.nextUrl.searchParams.get('task')
    let q = svc().from('c360_task_log').select('*').order('at', { ascending: false }).limit(task ? 200 : 60)
    if (task) q = q.eq('task_id', task)
    const { data, error } = await q
    if (error) return dbError(error)
    return NextResponse.json({ log: data ?? [] })
  }

  if (which !== 'all') return bad('Unknown request')
  const names: Entity[] = ['tasks', 'gates', 'teams', 'people', 'sponsors', 'weeks', 'risks']
  const results = await Promise.all([
    ...names.map((e) => {
      let q = svc().from(SPECS[e].table).select('*').limit(2000)
      for (const [col, asc] of SPECS[e].order) q = q.order(col, { ascending: asc, nullsFirst: false })
      return q
    }),
    svc().from('c360_settings').select('*').eq('id', 1).maybeSingle(),
    svc().from('c360_task_log').select('*').order('at', { ascending: false }).limit(60),
  ])
  for (const r of results) if (r.error) return dbError(r.error)
  const out: Record<string, unknown> = {}
  names.forEach((e, i) => { out[e] = results[i].data ?? [] })
  out.settings = results[names.length].data ?? { id: 1, event_name: 'COMMERCE 360', event_date: '2026-12-02', venue: null, budget_target: 0, review_rhythm: null, playbook: null }
  out.log = results[names.length + 1].data ?? []
  out.me = meFor(c)
  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  const c = await c360Caller(req)
  if (!c) return bad('Not allowed', 403)
  const body = await req.json().catch(() => ({}))

  if (req.nextUrl.searchParams.get('entity') === 'import') {
    if (!meFor(c).can.admin) return bad('Only the chairman or PR can import.', 403)
    const rows: Record<string, unknown>[] = Array.isArray(body.tasks) ? body.tasks.slice(0, 1000) : []
    if (!rows.length) return bad('No tasks found in the file.')
    const { data: existing, error } = await svc().from('c360_tasks').select('*')
    if (error) return dbError(error)
    const byCode = new Map((existing ?? []).map((t) => [String(t.code).toUpperCase(), t]))
    let added = 0, updated = 0, unchanged = 0
    const errors: string[] = []
    for (const raw of rows) {
      try {
        const row = clean('tasks', raw, true)
        const code = String(row.code || '').toUpperCase()
        if (!code) { errors.push('A row without an ID was skipped'); continue }
        row.code = code
        const prev = byCode.get(code)
        if (prev) {
          const next = taskRules({ ...row }, prev)
          const ch = diff(prev, next)
          if (!Object.keys(ch).length) { unchanged++; continue }
          const { error: e } = await svc().from('c360_tasks').update({ ...next, updated_at: new Date().toISOString(), updated_by: c.email }).eq('id', prev.id)
          if (e) { errors.push(`${code}: ${e.message}`); continue }
          await logTask(c, 'imported', prev, ch)
          updated++
        } else {
          const full = clean('tasks', raw, false)
          full.code = code
          const { data: ins, error: e } = await svc().from('c360_tasks').insert({ status: 'Not Started', priority: 'P2', ...taskRules(full), updated_by: c.email }).select('id, code').single()
          if (e) { errors.push(`${code}: ${e.message}`); continue }
          await logTask(c, 'imported', ins, null)
          added++
        }
      } catch (e) {
        errors.push((e as Error).message)
      }
    }
    return NextResponse.json({ added, updated, unchanged, errors: errors.slice(0, 20) })
  }

  const entity = entityOf(req)
  if (!entity) return bad('Unknown list')
  if (SPECS[entity].adminOnly && !meFor(c).can.admin) return bad('Only the chairman or PR can change this.', 403)
  let row: Record<string, unknown>
  try { row = clean(entity, body, false) } catch (e) { return bad((e as Error).message) }
  if (entity === 'tasks') {
    row.code = String(row.code).toUpperCase()
    row = taskRules({ status: 'Not Started', priority: 'P2', ...row })
  }
  const { data, error } = await svc().from(SPECS[entity].table).insert({ ...row, updated_by: c.email }).select('*').single()
  if (error) return dbError(error)
  if (entity === 'tasks') await logTask(c, 'created', data, null)
  return NextResponse.json({ row: data })
}

export async function PATCH(req: NextRequest) {
  const c = await c360Caller(req)
  if (!c) return bad('Not allowed', 403)
  const entity = entityOf(req)
  if (!entity) return bad('Unknown list')
  if (SPECS[entity].adminOnly && !meFor(c).can.admin) return bad('Only the chairman or PR can change this.', 403)
  const body = await req.json().catch(() => ({}))
  const table = SPECS[entity].table

  // bulk task update: { ids: [...], patch: {...} }
  const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 500) : body.id ? [String(body.id)] : []
  if (!ids.length) return bad('Missing id')
  let patch: Record<string, unknown>
  try { patch = clean(entity, body.ids ? body.patch ?? {} : body, true) } catch (e) { return bad((e as Error).message) }
  if (entity === 'tasks' && typeof patch.code === 'string') patch.code = patch.code.toUpperCase()
  if (!Object.keys(patch).length) return bad('Nothing to change')

  if (entity !== 'tasks') {
    const { data, error } = await svc().from(table).update({ ...patch, updated_at: new Date().toISOString(), updated_by: c.email }).in('id', ids).select('*')
    if (error) return dbError(error)
    return NextResponse.json({ rows: data ?? [], row: data?.[0] ?? null })
  }

  const { data: prevRows, error: e1 } = await svc().from(table).select('*').in('id', ids)
  if (e1) return dbError(e1)
  const rows: unknown[] = []
  for (const prev of prevRows ?? []) {
    const next = taskRules({ ...patch }, prev)
    const ch = diff(prev, next)
    if (!Object.keys(ch).length) { rows.push(prev); continue }
    const { data, error } = await svc().from(table).update({ ...next, updated_at: new Date().toISOString(), updated_by: c.email }).eq('id', prev.id).select('*').single()
    if (error) return dbError(error)
    await logTask(c, 'updated', prev, ch)
    rows.push(data)
  }
  return NextResponse.json({ rows, row: rows[0] ?? null })
}

export async function DELETE(req: NextRequest) {
  const c = await c360Caller(req)
  if (!c) return bad('Not allowed', 403)
  if (!meFor(c).can.delete) return bad('Only the chairman or PR can delete.', 403)
  const entity = entityOf(req)
  const id = req.nextUrl.searchParams.get('id')
  if (!entity || entity === 'settings' || !id) return bad('Unknown row')
  const table = SPECS[entity].table
  const { data: prev } = await svc().from(table).select('*').eq('id', id).maybeSingle()
  const { error } = await svc().from(table).delete().eq('id', id)
  if (error) return dbError(error)
  if (entity === 'tasks' && prev) await logTask(c, 'deleted', prev, { title: [prev.title, null] })
  return NextResponse.json({ ok: true })
}
