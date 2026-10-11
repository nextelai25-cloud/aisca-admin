'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { c360Api } from '@/lib/c360-client'
import type { C360Data, Entity, Task } from '@/lib/c360'

type Toast = { kind: 'ok' | 'err'; text: string } | null
type TaskOpen = { id: string | null; defaults?: Partial<Task> } | null

interface Ctx {
  data: C360Data | null
  loading: boolean
  error: string
  reload: (silent?: boolean) => Promise<void>
  /** Create (no id) or update (with id). Returns the saved row, or null on error (a toast is shown). */
  save: <T = any>(entity: Entity, row: Record<string, unknown>) => Promise<T | null>
  remove: (entity: Entity, id: string, label?: string) => Promise<boolean>
  bulkTasks: (ids: string[], patch: Partial<Task>) => Promise<boolean>
  importTasks: (rows: Record<string, unknown>[]) => Promise<{ added: number; updated: number; unchanged: number; errors: string[] } | null>
  openTask: (id: string | null, defaults?: Partial<Task>) => void
  taskOpen: TaskOpen
  closeTask: () => void
  toast: (kind: 'ok' | 'err', text: string) => void
  toastMsg: Toast
}

const C360Ctx = createContext<Ctx | null>(null)
export const useC360 = () => {
  const c = useContext(C360Ctx)
  if (!c) throw new Error('useC360 outside provider')
  return c
}

const LIST: Record<Exclude<Entity, 'settings'>, keyof C360Data> = {
  tasks: 'tasks', gates: 'gates', teams: 'teams', people: 'people', sponsors: 'sponsors', weeks: 'weeks', risks: 'risks',
}

export function C360Provider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<C360Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [taskOpen, setTaskOpen] = useState<TaskOpen>(null)
  const [toastMsg, setToast] = useState<Toast>(null)
  const timer = useRef<number | undefined>(undefined)

  const toast = useCallback((kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), kind === 'err' ? 6000 : 2800)
  }, [])

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const r = await c360Api<C360Data>('GET', { entity: 'all' })
    if (r.ok) { setData(r.data); setError('') } else setError(r.data?.error || 'Could not load COMMERCE 360.')
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])
  // Pick up teammates' changes when the tab comes back into focus, and every 2 minutes.
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === 'visible') reload(true) }
    document.addEventListener('visibilitychange', onFocus)
    const id = window.setInterval(() => reload(true), 120_000)
    return () => { document.removeEventListener('visibilitychange', onFocus); window.clearInterval(id) }
  }, [reload])

  const save = useCallback(async (entity: Entity, row: Record<string, unknown>) => {
    const isNew = !row.id
    const r = await c360Api(isNew ? 'POST' : 'PATCH', { entity }, row)
    if (!r.ok) { toast('err', r.data?.error || 'Could not save.'); return null }
    const saved = r.data.row
    setData((d) => {
      if (!d) return d
      if (entity === 'settings') return { ...d, settings: saved }
      const key = LIST[entity]
      const list = d[key] as any[]
      return { ...d, [key]: isNew ? [...list, saved] : list.map((x) => (x.id === saved.id ? saved : x)) }
    })
    if (entity === 'tasks') reloadLogSoon()
    return saved
  }, [toast])

  // Refresh the activity feed shortly after task edits (cheap, one request).
  const logTimer = useRef<number | undefined>(undefined)
  function reloadLogSoon() {
    window.clearTimeout(logTimer.current)
    logTimer.current = window.setTimeout(async () => {
      const r = await c360Api<{ log: C360Data['log'] }>('GET', { entity: 'log' })
      if (r.ok) setData((d) => (d ? { ...d, log: r.data.log } : d))
    }, 600)
  }

  const remove = useCallback(async (entity: Entity, id: string, label?: string) => {
    if (!confirm(`Delete ${label || 'this item'}? This cannot be undone.`)) return false
    const r = await c360Api('DELETE', { entity, id })
    if (!r.ok) { toast('err', r.data?.error || 'Could not delete.'); return false }
    if (entity !== 'settings') {
      const key = LIST[entity]
      setData((d) => (d ? { ...d, [key]: (d[key] as any[]).filter((x) => x.id !== id) } : d))
    }
    if (entity === 'tasks') reloadLogSoon()
    toast('ok', 'Deleted.')
    return true
  }, [toast])

  const bulkTasks = useCallback(async (ids: string[], patch: Partial<Task>) => {
    const r = await c360Api<{ rows: Task[] }>('PATCH', { entity: 'tasks' }, { ids, patch })
    if (!r.ok) { toast('err', r.data?.error || 'Could not update.'); return false }
    const byId = new Map(r.data.rows.map((t) => [t.id, t]))
    setData((d) => (d ? { ...d, tasks: d.tasks.map((t) => byId.get(t.id) ?? t) } : d))
    reloadLogSoon()
    return true
  }, [toast])

  const importTasks = useCallback(async (rows: Record<string, unknown>[]) => {
    const r = await c360Api<{ added: number; updated: number; unchanged: number; errors: string[] }>('POST', { entity: 'import' }, { tasks: rows })
    if (!r.ok) { toast('err', r.data?.error || 'Import failed.'); return null }
    await reload(true)
    return r.data
  }, [reload, toast])

  const value = useMemo<Ctx>(() => ({
    data, loading, error, reload, save, remove, bulkTasks, importTasks, taskOpen,
    openTask: (id, defaults) => setTaskOpen({ id, defaults }),
    closeTask: () => setTaskOpen(null),
    toast, toastMsg,
  }), [data, loading, error, reload, save, remove, bulkTasks, importTasks, taskOpen, toast, toastMsg])

  return <C360Ctx.Provider value={value}>{children}</C360Ctx.Provider>
}
