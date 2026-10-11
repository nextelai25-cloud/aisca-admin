'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { X, ChevronRight } from 'lucide-react'
import { STATUS_STYLE, PRIORITY_STYLE, tileFor, initials, fmtDays, type TaskStatus } from '@/lib/c360'

export function StatusChip({ status, small }: { status: string | null; small?: boolean }) {
  const s = STATUS_STYLE[status || 'Not Started'] || STATUS_STYLE['Not Started']
  return (
    <span className={`c3-chip ${small ? 'sm' : ''}`} style={{ background: s.bg, color: s.fg }}>
      <span className="c3-dot" style={{ background: s.dot }} />{s.label}
    </span>
  )
}

export function PriorityChip({ p }: { p: string }) {
  const s = PRIORITY_STYLE[p] || PRIORITY_STYLE.P2
  return <span className="c3-pri" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
}

/** Pastel letter tile (like the project tiles in the reference). */
export function Tile({ label, k, size = 28 }: { label: string; k?: string; size?: number }) {
  const t = tileFor(k || label)
  return (
    <span className="c3-tile" style={{ width: size, height: size, background: t.bg, color: t.fg, fontSize: size * 0.42 }} aria-hidden>
      {label}
    </span>
  )
}

export function Avatar({ name, size = 28 }: { name: string | null; size?: number }) {
  const t = tileFor(name || '?')
  return (
    <span className="c3-avatar" title={name || 'Unassigned'} style={{ width: size, height: size, background: name ? t.bg : '#F2F2F7', color: name ? t.fg : '#AEAEB2', fontSize: size * 0.38 }}>
      {name ? initials(name) : '–'}
    </span>
  )
}

/** Thin progress bar with a hover label. */
export function Bar({ pct, color = '#1D1D1F', height = 6, tip }: { pct: number; color?: string; height?: number; tip?: string }) {
  const p = Math.max(0, Math.min(100, pct))
  return (
    <span className="c3-bar" style={{ height }} data-tip={tip ?? `${Math.round(p)}%`}>
      <span style={{ width: `${p}%`, background: color }} />
    </span>
  )
}

export function DaysBadge({ days, done }: { days: number | null; done?: boolean }) {
  if (days === null) return <span className="c3-muted">—</span>
  const late = days < 0 && !done
  const soon = days >= 0 && days <= 3 && !done
  return <span className={`c3-days ${late ? 'late' : soon ? 'soon' : ''}`}>{done ? '—' : fmtDays(days)}</span>
}

export function Card({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <section className={`c3-card ${className}`} style={style}>{children}</section>
}

export function CardHead({ title, sub, href, action, info }: { title: string; sub?: string; href?: string; action?: React.ReactNode; info?: string }) {
  return (
    <div className="c3-card-head">
      <div style={{ minWidth: 0 }}>
        <h2 className="c3-h">{title}{info && <span className="c3-info" data-tip={info}>i</span>}</h2>
        {sub && <p className="c3-sub">{sub}</p>}
      </div>
      {action}
      {href && <Link href={href} className="c3-link">View all <ChevronRight size={14} /></Link>}
    </div>
  )
}

export function Empty({ text }: { text: string }) {
  return <div className="c3-empty">{text}</div>
}

/** Right-hand sheet (bottom sheet on phones). */
export function Sheet({ open, onClose, title, sub, children, footer, wide }: {
  open: boolean; onClose: () => void; title: string; sub?: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="c3-sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="c3-sheet-bg" onClick={onClose} />
      <div className={`c3-sheet ${wide ? 'wide' : ''}`}>
        <div className="c3-sheet-head">
          <div style={{ minWidth: 0 }}>
            <div className="c3-sheet-title">{title}</div>
            {sub && <div className="c3-sub">{sub}</div>}
          </div>
          <button className="c3-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="c3-sheet-body">{children}</div>
        {footer && <div className="c3-sheet-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children, hint, span }: { label: string; children: React.ReactNode; hint?: string; span?: boolean }) {
  return (
    <label className={`c3-field ${span ? 'span' : ''}`}>
      <span className="c3-label">{label}</span>
      {children}
      {hint && <span className="c3-hint">{hint}</span>}
    </label>
  )
}

export function StatusSelect({ value, onChange, disabled, compact }: { value: TaskStatus; onChange: (s: TaskStatus) => void; disabled?: boolean; compact?: boolean }) {
  const s = STATUS_STYLE[value] || STATUS_STYLE['Not Started']
  return (
    <span className={`c3-status-select ${compact ? 'sm' : ''}`} style={{ background: s.bg, color: s.fg }}>
      <span className="c3-dot" style={{ background: s.dot }} />
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as TaskStatus)} onClick={(e) => e.stopPropagation()} aria-label="Status">
        {Object.keys(STATUS_STYLE).map((k) => <option key={k} value={k}>{STATUS_STYLE[k].label}</option>)}
      </select>
    </span>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: React.ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="c3-seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}

export function C360Styles() {
  return (
    <style>{`
      .c3 { color: #1D1D1F; font-size: 14px; }
      .c3 *, .c3 *::before, .c3 *::after { box-sizing: border-box; }
      .c3-shell { display: grid; grid-template-columns: 252px minmax(0, 1fr); gap: 20px; align-items: start; }
      .c3-shell.collapsed { grid-template-columns: 64px minmax(0, 1fr); }
      .c3-main { min-width: 0; display: flex; flex-direction: column; gap: 16px; container-type: inline-size; container-name: c3main; }

      /* inner sidebar */
      .c3-side { position: sticky; top: 16px; background: #F2F2F4; border: 1px solid #E5E5EA; border-radius: 24px; padding: 16px 12px; display: flex; flex-direction: column; gap: 4px; max-height: calc(100vh - 100px); overflow-y: auto; }
      .c3-side > *, .c3-side .c3-nav { flex-shrink: 0; }
      .c3-brand { display: flex; align-items: center; gap: 12px; padding: 4px 6px 12px; }
      .c3-logo { width: 40px; height: 40px; border-radius: 12px; background: #1D1D1F; color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 13px; letter-spacing: -.02em; flex-shrink: 0; }
      .c3-brand-name { font-size: 17px; font-weight: 700; letter-spacing: -.01em; line-height: 1.15; }
      .c3-brand-sub { font-size: 13px; color: #6E6E73; }
      .c3-collapse { margin-left: auto; width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; color: #6E6E73; background: transparent; border: none; cursor: pointer; flex-shrink: 0; }
      .c3-collapse:hover { background: rgba(0,0,0,.05); }
      .c3-search { display: flex; align-items: center; gap: 8px; height: 44px; border-radius: 14px; background: #E5E5EA; padding: 0 8px 0 12px; margin: 4px 0 8px; }
      .c3-search input { flex: 1; min-width: 0; border: none !important; outline: none; background: transparent; font-size: 15px; color: #1D1D1F; box-shadow: none !important; }
      .c3-kbd { height: 24px; min-width: 24px; padding: 0 6px; border-radius: 7px; background: #fff; font-size: 12px; color: #6E6E73; display: grid; place-items: center; box-shadow: 0 1px 1px rgba(0,0,0,.06); }
      .c3-side-label { font-size: 13px; color: #6E6E73; padding: 8px 8px 4px; display: flex; align-items: center; justify-content: space-between; }
      .c3-nav { display: flex; align-items: center; gap: 12px; height: 44px; padding: 0 12px; border-radius: 999px; color: #1D1D1F; text-decoration: none; font-size: 15px; font-weight: 500; transition: background .2s; white-space: nowrap; }
      .c3-nav:hover { background: rgba(0,0,0,.04); }
      .c3-nav.on { background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.05); font-weight: 600; }
      .c3-nav svg { color: #48484A; flex-shrink: 0; }
      .c3-nav .c3-count { margin-left: auto; font-size: 12px; color: #6E6E73; font-weight: 600; }
      .c3-divider { height: 1px; background: #E0E0E5; margin: 10px 6px; }
      .c3-countdown { margin-top: 8px; background: #1D1D1F; color: #fff; border-radius: 18px; padding: 14px; }
      .c3-countdown b { font-size: 28px; font-weight: 700; letter-spacing: -.02em; }
      .c3-shell.collapsed .c3-side .c3-hide-c { display: none !important; }
      .c3-shell.collapsed .c3-nav { justify-content: center; padding: 0; }
      .c3-shell.collapsed .c3-brand { justify-content: center; flex-direction: column; }
      .c3-shell.collapsed .c3-collapse { margin: 0; }

      /* mobile tabs */
      .c3-mtabs { display: none; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
      .c3-mtabs::-webkit-scrollbar { display: none; }
      .c3-mtabs a { flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 999px; background: #fff; border: 1px solid #E5E5EA; color: #1D1D1F; text-decoration: none; font-size: 13px; font-weight: 600; }
      .c3-mtabs a.on { background: #1D1D1F; color: #fff; border-color: #1D1D1F; }
      @media (max-width: 1180px) {
        .c3-shell, .c3-shell.collapsed { grid-template-columns: minmax(0, 1fr); }
        .c3-side { display: none; }
        .c3-mtabs { display: flex; }
      }

      /* type */
      .c3-greet { font-size: 28px; line-height: 34px; font-weight: 700; letter-spacing: -.02em; margin: 0; }
      .c3-greet span { color: #8E8E93; font-weight: 600; }
      .c3-lead { font-size: 15px; color: #6E6E73; margin: 4px 0 0; }
      .c3-h { font-size: 17px; font-weight: 700; letter-spacing: -.01em; margin: 0; display: flex; align-items: center; gap: 6px; }
      .c3-sub { font-size: 13px; color: #6E6E73; margin: 2px 0 0; line-height: 1.4; }
      .c3-muted { color: #8E8E93; }
      .c3-info { width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid #AEAEB2; color: #8E8E93; font-size: 10px; font-weight: 700; display: inline-grid; place-items: center; font-style: normal; cursor: help; position: relative; }

      /* cards */
      .c3-card { background: #fff; border: 1px solid #E8E8ED; border-radius: 22px; padding: 20px; min-width: 0; }
      .c3-card-head { display: flex; align-items: flex-start; gap: 12px; justify-content: space-between; margin-bottom: 14px; }
      .c3-link { display: inline-flex; align-items: center; gap: 2px; font-size: 13px; font-weight: 600; color: #1D1D1F; text-decoration: none; white-space: nowrap; flex-shrink: 0; }
      .c3-link:hover { text-decoration: underline; }
      .c3-grid { display: grid; gap: 16px; }
      .c3-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .c3-g2 { grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); }
      .c3-g3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      @container c3main (max-width: 1040px) { .c3-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .c3-g3 { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
      @container c3main (max-width: 760px) { .c3-g2, .c3-g3 { grid-template-columns: minmax(0, 1fr); } .c3-greet { font-size: 22px; line-height: 28px; } }
      @media (max-width: 520px) { .c3-stats { gap: 10px; } .c3-card { padding: 16px; border-radius: 18px; } }

      /* stat card (reference: icon tile + big number) */
      .c3-stat { display: flex; align-items: center; gap: 14px; }
      .c3-stat-ico { width: 52px; height: 52px; border-radius: 14px; display: grid; place-items: center; flex-shrink: 0; border: 1px solid rgba(0,0,0,.04); }
      .c3-stat-num { font-size: 28px; line-height: 32px; font-weight: 700; letter-spacing: -.02em; }
      .c3-stat-label { font-size: 15px; font-weight: 600; color: #1D1D1F; }
      .c3-stat-note { font-size: 12px; color: #6E6E73; margin-top: 2px; }
      .c3-stat-note.good { color: #1A7F1A; } .c3-stat-note.bad { color: #B42318; }
      @media (max-width: 520px) { .c3-stat { flex-direction: column; align-items: flex-start; gap: 10px; } .c3-stat-ico { width: 40px; height: 40px; border-radius: 12px; } .c3-stat-num { font-size: 24px; } .c3-stat-label { font-size: 13px; } }

      /* chips, tiles, avatars */
      .c3-chip { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
      .c3-chip.sm { height: 22px; padding: 0 8px; font-size: 11px; }
      .c3-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
      .c3-pri { display: inline-grid; place-items: center; height: 22px; min-width: 28px; padding: 0 6px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: .02em; }
      .c3-tile { display: inline-grid; place-items: center; border-radius: 8px; font-weight: 700; flex-shrink: 0; letter-spacing: -.02em; }
      .c3-avatar { display: inline-grid; place-items: center; border-radius: 50%; font-weight: 700; flex-shrink: 0; border: 2px solid #fff; }
      .c3-bar { position: relative; display: block; width: 100%; background: #EDEDF0; border-radius: 999px; overflow: visible; }
      .c3-bar > span { display: block; height: 100%; border-radius: 999px; transition: width .4s cubic-bezier(.25,.1,.25,1); }
      .c3-days { font-size: 13px; font-weight: 600; white-space: nowrap; color: #48484A; }
      .c3-days.late { color: #B42318; } .c3-days.soon { color: #8A5A00; }

      /* tooltips: any element with data-tip */
      [data-tip] { position: relative; }
      [data-tip]:hover::after { content: attr(data-tip); position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%); background: #1D1D1F; color: #fff; font-size: 12px; font-weight: 500; line-height: 1.35; padding: 6px 9px; border-radius: 8px; white-space: pre-line; width: max-content; max-width: 260px; z-index: 50; pointer-events: none; box-shadow: 0 6px 20px rgba(0,0,0,.18); }

      /* list rows (top projects style) */
      .c3-rows { display: flex; flex-direction: column; }
      .c3-row { display: flex; align-items: center; gap: 12px; padding: 10px 4px; border-radius: 12px; color: inherit; text-decoration: none; cursor: pointer; background: none; border: none; width: 100%; text-align: left; font: inherit; }
      .c3-row:hover { background: #F5F5F7; }
      .c3-row + .c3-row { border-top: 1px solid #F2F2F4; }
      .c3-row-title { font-size: 15px; font-weight: 500; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .c3-pill-note { display: inline-flex; align-items: center; gap: 8px; margin-top: 14px; padding: 8px 14px 8px 8px; border-radius: 999px; border: 1px solid #E8E8ED; background: #FAFAFB; font-size: 14px; color: #6E6E73; }
      .c3-pill-note b { color: #1D1D1F; }
      .c3-pill-ico { width: 30px; height: 30px; border-radius: 50%; background: #E8F7E8; color: #1A7F1A; display: grid; place-items: center; }

      /* table (upcoming deadlines style) */
      .c3-table-wrap { border: 1px solid #EDEDF0; border-radius: 16px; overflow: auto; }
      .c3-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 14px; }
      .c3-table th { position: sticky; top: 0; z-index: 1; background: #F5F5F7; text-align: left; font-weight: 500; color: #6E6E73; font-size: 13px; padding: 11px 12px; white-space: nowrap; border-bottom: 1px solid #EDEDF0; }
      .c3-table th button { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
      .c3-table td { padding: 12px; border-bottom: 1px solid #F2F2F4; vertical-align: middle; background: #fff; }
      .c3-table tr:last-child td { border-bottom: none; }
      .c3-table tbody tr { cursor: pointer; }
      .c3-table tbody tr:hover td { background: #FAFAFB; }
      .c3-table tr.sel td { background: #F4F4F6; }
      .c3-id { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12px; color: #6E6E73; white-space: nowrap; }
      .c3-task-title { font-weight: 500; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-width: 220px; }
      .c3-check { width: 20px; height: 20px; border-radius: 6px; border: 1.5px solid #C7C7CC; background: #fff; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; padding: 0; }
      .c3-check.on { background: #1D1D1F; border-color: #1D1D1F; color: #fff; }
      .c3-check.done { border-radius: 50%; }
      .c3-check.done.on { background: #0CA30C; border-color: #0CA30C; }

      /* controls */
      .c3-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 38px; padding: 0 14px; border-radius: 999px; font-size: 13px; font-weight: 600; border: 1px solid #E5E5EA; background: #fff; color: #1D1D1F; cursor: pointer; white-space: nowrap; text-decoration: none; }
      .c3-btn:hover { background: #F5F5F7; }
      .c3-btn.dark { background: #1D1D1F; color: #fff; border-color: #1D1D1F; }
      .c3-btn.dark:hover { background: #333336; }
      .c3-btn.danger { color: #B42318; border-color: #F3C9C5; }
      .c3-btn:disabled { opacity: .5; cursor: default; }
      .c3-icon-btn { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: #F2F2F7; border: none; color: #1D1D1F; cursor: pointer; flex-shrink: 0; }
      .c3-input, .c3-select, .c3-textarea { width: 100%; height: 40px; padding: 0 12px; border-radius: 12px; border: 1px solid #E5E5EA; background: #fff; font-size: 14px; color: #1D1D1F; outline: none; font-family: inherit; }
      .c3-textarea { height: auto; min-height: 84px; padding: 10px 12px; resize: vertical; line-height: 1.45; }
      .c3-select { appearance: auto; }
      .c3-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
      .c3-field.span { grid-column: 1 / -1; }
      .c3-label { font-size: 12px; font-weight: 600; color: #6E6E73; }
      .c3-hint { font-size: 12px; color: #8E8E93; }
      .c3-form { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      @media (max-width: 560px) { .c3-form { grid-template-columns: 1fr; } }
      .c3-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
      .c3-toolbar .c3-select, .c3-toolbar .c3-input { width: auto; height: 36px; border-radius: 999px; font-size: 13px; }
      .c3-toolbar .c3-select { max-width: 190px; }
      .c3-tsearch { position: relative; flex: 1; min-width: 200px; max-width: 360px; }
      .c3-tsearch input { padding-left: 36px !important; width: 100% !important; }
      .c3-tsearch svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #8E8E93; }
      .c3-toggle { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; border-radius: 999px; border: 1px solid #E5E5EA; background: #fff; font-size: 13px; font-weight: 600; cursor: pointer; color: #1D1D1F; }
      .c3-toggle.on { background: #1D1D1F; color: #fff; border-color: #1D1D1F; }
      .c3-seg { display: inline-flex; padding: 3px; gap: 2px; background: #EDEDF0; border-radius: 999px; }
      .c3-seg button { height: 30px; padding: 0 12px; border-radius: 999px; border: none; background: transparent; font-size: 13px; font-weight: 600; color: #48484A; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
      .c3-seg button.on { background: #fff; color: #1D1D1F; box-shadow: 0 1px 2px rgba(0,0,0,.08); }
      .c3-status-select { position: relative; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 8px 0 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
      .c3-status-select.sm { height: 24px; font-size: 11px; }
      .c3-status-select select { appearance: none; border: none; background: transparent; color: inherit; font: inherit; padding-right: 14px; cursor: pointer; outline: none; box-shadow: none !important; }
      .c3-status-select::after { content: ''; position: absolute; right: 9px; top: 50%; width: 5px; height: 5px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: translateY(-70%) rotate(45deg); pointer-events: none; }
      .c3-empty { padding: 28px 12px; text-align: center; color: #8E8E93; font-size: 14px; }

      /* sheet */
      .c3-sheet-wrap { position: fixed; inset: 0; z-index: 1000; display: flex; justify-content: flex-end; }
      .c3-sheet-bg { position: absolute; inset: 0; background: rgba(0,0,0,.28); backdrop-filter: blur(2px); animation: c3fade .2s ease; }
      .c3-sheet { position: relative; width: min(560px, 100%); height: 100%; background: #fff; display: flex; flex-direction: column; box-shadow: -20px 0 60px rgba(0,0,0,.15); animation: c3in .32s cubic-bezier(.32,.72,0,1); }
      .c3-sheet.wide { width: min(720px, 100%); }
      .c3-sheet-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 20px 20px 12px; border-bottom: 1px solid #F2F2F4; }
      .c3-sheet-title { font-size: 20px; font-weight: 700; letter-spacing: -.01em; line-height: 1.25; }
      .c3-sheet-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 18px; }
      .c3-sheet-foot { padding: 14px 20px; border-top: 1px solid #F2F2F4; display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
      @keyframes c3in { from { transform: translateX(40px); opacity: 0 } to { transform: none; opacity: 1 } }
      @keyframes c3fade { from { opacity: 0 } to { opacity: 1 } }
      @media (max-width: 640px) {
        .c3-sheet-wrap { align-items: flex-end; }
        .c3-sheet, .c3-sheet.wide { width: 100%; height: 92vh; border-radius: 22px 22px 0 0; animation-name: c3up; }
        @keyframes c3up { from { transform: translateY(60px); opacity: 0 } to { transform: none; opacity: 1 } }
      }

      /* toast */
      .c3-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 1100; padding: 12px 18px; border-radius: 999px; font-size: 14px; font-weight: 600; box-shadow: 0 10px 30px rgba(0,0,0,.2); animation: c3fade .2s ease; max-width: calc(100vw - 32px); }
      .c3-toast.ok { background: #1D1D1F; color: #fff; } .c3-toast.err { background: #B42318; color: #fff; }
    `}</style>
  )
}
