'use client'
import React, { useState } from 'react'
import { X, Paperclip, Loader2 } from 'lucide-react'
import { uploadFinFile } from '@/lib/fin-client'

export const C = { ink: '#1D1D1F', sub: '#6E6E73', line: '#E5E5EA', soft: '#F5F5F7', red: '#D70015', green: '#1F7A3A', amber: '#A05A00', blue: '#1B3A8C' }

export const card: React.CSSProperties = { background: '#FFFFFF', border: `1px solid ${C.line}`, borderRadius: 16, padding: 18 }
export const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.sub, textTransform: 'uppercase', letterSpacing: '.04em', padding: '10px 12px', borderBottom: `1px solid ${C.line}`, whiteSpace: 'nowrap' }
export const td: React.CSSProperties = { fontSize: 13, color: C.ink, padding: '11px 12px', borderBottom: `1px solid ${C.soft}`, verticalAlign: 'top' }
export const tdNum: React.CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }

export function Btn({ children, onClick, kind = 'ghost', disabled, small, type = 'button', title }: {
  children: React.ReactNode; onClick?: () => void; kind?: 'primary' | 'ghost' | 'danger' | 'ok'; disabled?: boolean; small?: boolean; type?: 'button' | 'submit'; title?: string
}) {
  const bg = kind === 'primary' ? C.ink : kind === 'danger' ? '#FFF1F2' : kind === 'ok' ? '#EAF7EE' : C.soft
  const fg = kind === 'primary' ? '#FFFFFF' : kind === 'danger' ? C.red : kind === 'ok' ? C.green : C.ink
  return (
    <button type={type} title={title} onClick={onClick} disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: bg, color: fg, border: 'none', borderRadius: 10,
        padding: small ? '6px 10px' : '9px 14px', fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap', minHeight: 0 }}>
      {children}
    </button>
  )
}

const TONE: Record<string, [string, string]> = {
  pending_cfo: ['#FFF6E5', C.amber], pending_second: ['#FFF6E5', C.amber], authorised: ['#EEF2FF', C.blue],
  approved: ['#EAF7EE', C.green], paid: ['#EAF7EE', C.green], rejected: ['#FFF1F2', C.red], cancelled: [C.soft, C.sub], void: [C.soft, C.sub],
}
export function Badge({ status, label }: { status: string; label: string }) {
  const [bg, fg] = TONE[status] || [C.soft, C.sub]
  return <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>{label}</span>
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 16px', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#FFFFFF', borderRadius: 18, width: '100%', maxWidth: wide ? 860 : 560, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${C.line}` }}>
          <b style={{ fontSize: 15 }}>{title}</b>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sub, minHeight: 0 }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', border: `1px solid ${C.line}`, borderRadius: 10, padding: '9px 11px', fontSize: 13, color: C.ink, background: '#FFFFFF', outline: 'none' }

export function Field({ label, hint, children, span2 }: { label: string; hint?: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: span2 ? '1 / -1' : undefined }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: C.sub }}>{hint}</span>}
    </label>
  )
}
export const Grid = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>{children}</div>
)

export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...p} style={{ ...inputStyle, ...(p.style || {}) }} /> }
export function Textarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea rows={3} {...p} style={{ ...inputStyle, resize: 'vertical', ...(p.style || {}) }} /> }
export function Select({ options, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: (string | [string, string])[] }) {
  return (
    <select {...p} style={{ ...inputStyle, ...(p.style || {}) }}>
      {options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={v} value={v}>{l}</option> })}
    </select>
  )
}

/** Picks a file, uploads it, and reports the public link. */
export function FileField({ label, value, onChange, required, hint }: { label: string; value: string; onChange: (url: string) => void; required?: boolean; hint?: string }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <Field label={label + (required ? ' *' : '')} hint={err || hint}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ ...inputStyle, width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: C.soft, border: 'none', fontWeight: 600 }}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
          {value ? 'Replace file' : 'Attach file'}
          <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return
            setBusy(true); setErr('')
            const r = await uploadFinFile(f)
            setBusy(false)
            if (r.url) onChange(r.url); else setErr(r.error || 'Upload failed')
            e.target.value = ''
          }} />
        </label>
        {value && <a href={value} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.blue }}>View attached file</a>}
      </div>
    </Field>
  )
}

export function Empty({ text }: { text: string }) {
  return <div style={{ padding: '36px 12px', textAlign: 'center', color: C.sub, fontSize: 13 }}>{text}</div>
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, letterSpacing: '-.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export const FormError = ({ text }: { text: string }) =>
  text ? <div style={{ background: '#FFF1F2', color: C.red, fontSize: 13, padding: '9px 12px', borderRadius: 10, marginTop: 12 }}>{text}</div> : null
