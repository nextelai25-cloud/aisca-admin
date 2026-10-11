'use client'

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  LayoutGrid, ListChecks, ListTodo, SquareKanban, CalendarDays, Milestone, Users, Handshake, CalendarRange, ShieldAlert,
  PanelLeftClose, PanelLeftOpen, Search, Plus, ArrowLeft, Menu,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { canAccess, type AdminRole } from '@/lib/roles'
import { C360Provider, useC360 } from './_c360/context'
import { C360Styles, Tile, Card, Avatar } from './_c360/ui'
import TaskSheet from './_c360/TaskSheet'
import Preloader from './_c360/Preloader'
import { daysLeft, fmtDate, teamTag, teamShort, ownerIncludes } from '@/lib/c360'

const BASE = '/commerce360'
type Profile = { name: string; role: string; email: string }

// COMMERCE 360 runs full screen, outside the admin dashboard frame.
export default function Commerce360Layout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [intro, setIntro] = useState(true)

  useEffect(() => {
    document.title = 'COMMERCE 360 | AISCA Admin'
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }
      const role = session.user.user_metadata?.role || 'board_member'
      if (!canAccess(role as AdminRole, 'commerce360')) { window.location.href = '/dashboard'; return }
      setProfile({ name: session.user.user_metadata?.name || 'Board member', role, email: session.user.email || '' })
    })()
  }, [])

  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&display=swap" precedence="default" />
      {profile && (
        <C360Provider>
          <C360Styles />
          <LoadWatch onReady={() => setLoaded(true)} />
          <Suspense fallback={null}>
            <Shell profile={profile}>{children}</Shell>
          </Suspense>
        </C360Provider>
      )}
      {intro && <Preloader ready={!!profile && loaded} onDone={() => setIntro(false)} />}
    </>
  )
}

function LoadWatch({ onReady }: { onReady: () => void }) {
  const { loading } = useC360()
  const done = useRef(false)
  useEffect(() => { if (!loading && !done.current) { done.current = true; onReady() } }, [loading, onReady])
  return null
}

function Shell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const { data, loading, error, reload, openTask, toastMsg } = useC360()
  const pathname = usePathname()
  const params = useSearchParams()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [q, setQ] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let pref: string | null = null
    try { pref = localStorage.getItem('c360-collapsed') } catch {}
    setCollapsed(pref === null ? window.innerWidth < 1280 : pref === '1')
    const onKey = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName || '')
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCollapsed(false); searchRef.current?.focus() }
      else if (e.key === '/' && !typing) { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  // close the phone drawer whenever the page changes
  useEffect(() => { setDrawer(false) }, [pathname, params])
  const toggle = useCallback(() => setCollapsed((c) => { try { localStorage.setItem('c360-collapsed', c ? '0' : '1') } catch {} return !c }), [])

  const counts = useMemo(() => {
    if (!data) return { mine: 0, open: 0 }
    const open = data.tasks.filter((t) => t.status !== 'Done')
    return { mine: open.filter((t) => ownerIncludes(t.owner, data.me.name)).length, open: open.length }
  }, [data])

  const mine = params.get('mine') === '1'
  const nav = [
    { href: BASE, label: 'Dashboard', icon: LayoutGrid, on: pathname === BASE },
    { href: `${BASE}/tasks?mine=1`, label: 'My Tasks', icon: ListTodo, on: pathname === `${BASE}/tasks` && mine, count: counts.mine },
    { href: `${BASE}/tasks`, label: 'All Tasks', icon: ListChecks, on: pathname === `${BASE}/tasks` && !mine && !params.get('team'), count: counts.open },
    { href: `${BASE}/board`, label: 'Kanban Board', icon: SquareKanban, on: pathname === `${BASE}/board` },
    { href: `${BASE}/calendar`, label: 'Calendar', icon: CalendarDays, on: pathname === `${BASE}/calendar` },
    { href: `${BASE}/gates`, label: 'Critical Path', icon: Milestone, on: pathname === `${BASE}/gates` },
    { href: `${BASE}/sponsors`, label: 'Sponsors', icon: Handshake, on: pathname === `${BASE}/sponsors` },
    { href: `${BASE}/teams`, label: 'Teams', icon: Users, on: pathname === `${BASE}/teams` },
    { href: `${BASE}/plan`, label: 'Weekly Plan', icon: CalendarRange, on: pathname === `${BASE}/plan` },
    { href: `${BASE}/risks`, label: 'Risks', icon: ShieldAlert, on: pathname === `${BASE}/risks` },
  ]

  function search(e: React.FormEvent) {
    e.preventDefault()
    router.push(`${BASE}/tasks${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
  }

  const evDays = data ? daysLeft(data.settings.event_date) : null
  const activeTeam = pathname === `${BASE}/tasks` ? params.get('team') : null
  const roleLabel = profile.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="c3 c3-app">
      <div className={`c3-shell ${collapsed ? 'collapsed' : ''} ${drawer ? 'drawer' : ''}`}>
        <div className="c3-scrim" onClick={() => setDrawer(false)} />
        <aside className="c3-side" aria-label="COMMERCE 360 menu">
          <div className="c3-brand">
            <span className="c3-logo">360°</span>
            <div className="c3-hide-c" style={{ minWidth: 0 }}>
              <div className="c3-wordmark">COMMERCE <span>360°</span></div>
              <div className="c3-brand-sub">Project Workspace</div>
            </div>
            <button className="c3-collapse c3-collapse-btn" onClick={toggle} aria-label={collapsed ? 'Expand menu' : 'Collapse menu'} data-tip={collapsed ? 'Expand' : undefined}>
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>

          <form className="c3-search c3-hide-c" onSubmit={search} role="search">
            <Search size={18} color="#6E6E73" />
            <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks" aria-label="Search tasks" />
            <span className="c3-kbd">⌘K</span><span className="c3-kbd">/</span>
          </form>

          <div className="c3-side-label c3-hide-c">Main Menu</div>
          {nav.map((n) => {
            const Icon = n.icon
            return (
              <Link key={n.label} href={n.href} className={`c3-nav ${n.on ? 'on' : ''}`} aria-current={n.on ? 'page' : undefined} data-tip={collapsed ? n.label : undefined}>
                <Icon size={20} strokeWidth={1.8} />
                <span className="c3-hide-c">{n.label}</span>
                {!!n.count && <span className="c3-count c3-hide-c">{n.count}</span>}
              </Link>
            )
          })}

          {data && (
            <div className="c3-hide-c">
              <div className="c3-divider" />
              <div className="c3-side-label">
                Teams
                <button className="c3-collapse" style={{ width: 26, height: 26 }} onClick={() => openTask(null)} aria-label="New task" data-tip="New task"><Plus size={16} /></button>
              </div>
              {data.teams.map((t) => {
                const open = data.tasks.filter((x) => x.team === t.name && x.status !== 'Done').length
                return (
                  <Link key={t.id} href={`${BASE}/tasks?team=${encodeURIComponent(t.name)}`} className={`c3-nav ${activeTeam === t.name ? 'on' : ''}`} style={{ height: 40, fontSize: 14 }}>
                    <Tile label={teamTag(t.name)} k={t.name} size={26} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{teamShort(t.name)}</span>
                    {open > 0 && <span className="c3-count">{open}</span>}
                  </Link>
                )
              })}
            </div>
          )}

          {data && evDays !== null && (
            <div className="c3-side-count c3-hide-c">
              <div className="c3-countdown">
                <div style={{ fontSize: 11, opacity: .65, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Event day</div>
                <div><b>{evDays > 0 ? evDays : evDays === 0 ? 'Today' : 'Done'}</b>{evDays > 0 && <span style={{ fontSize: 14, opacity: .8 }}> days to go</span>}</div>
                <div style={{ fontSize: 13, opacity: .75 }}>{fmtDate(data.settings.event_date, true)}{data.settings.venue ? ` · ${data.settings.venue}` : ''}</div>
              </div>
            </div>
          )}

          <div className="c3-side-foot">
            <Link href="/dashboard" className="c3-back" data-tip={collapsed ? 'Back to admin' : undefined} aria-label="Back to admin dashboard">
              <ArrowLeft size={18} /><span className="c3-hide-c">Back to admin</span>
            </Link>
            <div className="c3-me c3-hide-c">
              <Avatar name={profile.name} size={34} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.name}</div>
                <div style={{ fontSize: 12, color: '#6E6E73' }}>{roleLabel}</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="c3-main">
          <div className="c3-topbar">
            <button className="c3-icon-btn" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={18} /></button>
            <div className="c3-wordmark" style={{ flex: 1 }}>COMMERCE <span>360°</span></div>
            <Link href="/dashboard" className="c3-icon-btn" aria-label="Back to admin dashboard"><ArrowLeft size={18} /></Link>
          </div>
          <nav className="c3-mtabs" aria-label="COMMERCE 360 sections">
            {nav.map((n) => <Link key={n.label} href={n.href} className={n.on ? 'on' : ''}>{n.label}{!!n.count && ` · ${n.count}`}</Link>)}
          </nav>

          {loading && !data ? null : error && !data ? (
            <Card>
              <h2 className="c3-h">COMMERCE 360 could not load</h2>
              <p className="c3-sub" style={{ marginTop: 6 }}>{error}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="c3-btn dark" onClick={() => reload()}>Try again</button>
                <Link href="/dashboard" className="c3-btn">Back to admin</Link>
              </div>
            </Card>
          ) : children}
        </main>
      </div>

      <TaskSheet />
      {toastMsg && <div className={`c3-toast ${toastMsg.kind}`} role="status">{toastMsg.text}</div>}
    </div>
  )
}
