'use client'

import React, { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useC360 } from './context'
import { Sheet, Field } from './ui'
import type { Entity } from '@/lib/c360'

export interface FieldDef {
  key: string
  label: string
  type?: 'text' | 'long' | 'date' | 'num' | 'int' | 'select' | 'bool' | 'list'
  options?: readonly string[]
  span?: boolean
  hint?: string
  placeholder?: string
}

/** Create / edit any COMMERCE 360 record from a list of fields. */
export default function RecordSheet({ entity, title, fields, row, defaults, onClose, canDelete, deleteLabel }: {
  entity: Entity
  title: string
  fields: FieldDef[]
  row: Record<string, any> | null
  defaults?: Record<string, unknown>
  onClose: () => void
  canDelete?: boolean
  deleteLabel?: string
}) {
  const { save, remove, toast } = useC360()
  const [f, setF] = useState<Record<string, any>>({})
  const [busy, setBusy] = useState(false)
  // The sheet mounts fresh each time it opens, so defaults are read once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setF(row ? { ...row } : { ...defaults }) }, [row])

  async function submit() {
    setBusy(true)
    const payload: Record<string, unknown> = {}
    for (const fd of fields) payload[fd.key] = f[fd.key] ?? (fd.type === 'bool' ? false : null)
    if (row?.id !== undefined) payload.id = row.id
    const saved = await save(entity, payload)
    setBusy(false)
    if (saved) { toast('ok', row ? 'Saved.' : 'Added.'); onClose() }
  }

  return (
    <Sheet open onClose={onClose} title={title}
      footer={<>
        {canDelete && row?.id && (
          <button className="c3-btn danger" style={{ marginRight: 'auto' }} onClick={async () => { if (await remove(entity, row.id, deleteLabel)) onClose() }}><Trash2 size={15} /> Delete</button>
        )}
        <button className="c3-btn" onClick={onClose}>Cancel</button>
        <button className="c3-btn dark" onClick={submit} disabled={busy}>{busy ? 'Saving…' : row ? 'Save changes' : 'Add'}</button>
      </>}
    >
      <div className="c3-form">
        {fields.map((fd) => {
          const v = f[fd.key]
          const set = (x: unknown) => setF((p) => ({ ...p, [fd.key]: x }))
          const t = fd.type || 'text'
          return (
            <Field key={fd.key} label={fd.label} hint={fd.hint} span={fd.span || t === 'long'}>
              {t === 'long' ? <textarea className="c3-textarea" value={v ?? ''} onChange={(e) => set(e.target.value)} rows={3} placeholder={fd.placeholder} />
                : t === 'select' ? (
                  <select className="c3-select" value={v ?? ''} onChange={(e) => set(e.target.value || null)}>
                    <option value="">—</option>
                    {fd.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : t === 'list' ? (
                  <>
                    <input className="c3-input" list={`c3-l-${fd.key}`} value={v ?? ''} onChange={(e) => set(e.target.value)} placeholder={fd.placeholder} />
                    <datalist id={`c3-l-${fd.key}`}>{(fd.options || []).map((o) => <option key={o} value={o} />)}</datalist>
                  </>
                ) : t === 'bool' ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, fontSize: 14 }}>
                    <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#1D1D1F' }} /> Yes
                  </label>
                ) : (
                  <input className="c3-input" type={t === 'date' ? 'date' : 'text'} inputMode={t === 'num' || t === 'int' ? 'decimal' : undefined}
                    value={v ?? ''} onChange={(e) => set(t === 'num' || t === 'int' ? e.target.value.replace(/[^\d.\-]/g, '') : e.target.value)} placeholder={fd.placeholder} />
                )}
            </Field>
          )
        })}
      </div>
    </Sheet>
  )
}
