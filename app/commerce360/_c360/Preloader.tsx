'use client'

import React, { useEffect, useRef, useState } from 'react'

/**
 * COMMERCE 360° intro. The wordmark builds in, then an orange ring sweeps a
 * full circle while the number counts 0 → 360. It stays up until `ready` is
 * true (signed in + data loaded) and at least one full sweep has played,
 * then lifts away to reveal the workspace.
 */
const MIN_MS = 1900

export default function Preloader({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [n, setN] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const start = useRef<number>(0)

  // count 0 → 360 in step with the ring (ease out)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    start.current = performance.now()
    if (reduce) { setN(360); return }
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start.current - 450) / 1300))
      setN(Math.round(360 * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (!ready || leaving) return
    const wait = Math.max(0, MIN_MS - (performance.now() - start.current))
    const t1 = window.setTimeout(() => setLeaving(true), wait)
    return () => window.clearTimeout(t1)
  }, [ready, leaving])

  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(onDone, 650)
    return () => window.clearTimeout(t)
  }, [leaving, onDone])

  const letters = 'COMMERCE'.split('')
  return (
    <div className={`c3pl ${leaving ? 'out' : ''}`} role="status" aria-live="polite" aria-label="Loading COMMERCE 360">
      <div className="c3pl-in">
        <div className="c3pl-mark">
          <span className="c3pl-word" aria-hidden>
            {letters.map((c, i) => <span key={i} style={{ animationDelay: `${80 + i * 45}ms` }}>{c}</span>)}
          </span>
          <span className="c3pl-num" aria-hidden>
            <svg className="c3pl-ring" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" className="track" />
              <circle cx="60" cy="60" r="54" className="arc" />
            </svg>
            <span className="c3pl-digits">{n}</span><span className="c3pl-deg">°</span>
          </span>
        </div>
        <div className="c3pl-sub">Project Workspace</div>
        <div className="c3pl-bar"><span /></div>
      </div>
      <style>{`
        .c3pl { position: fixed; inset: 0; z-index: 2000; background: #0A0A0A; color: #fff; display: grid; place-items: center; font-family: 'Montserrat', -apple-system, 'Helvetica Neue', sans-serif; transition: opacity .55s cubic-bezier(.32,.72,0,1), visibility .55s; }
        .c3pl.out { opacity: 0; visibility: hidden; }
        .c3pl-in { display: flex; flex-direction: column; align-items: center; gap: clamp(34px, 6vw, 64px); transition: transform .6s cubic-bezier(.32,.72,0,1), filter .6s; padding: 0 20px; }
        .c3pl.out .c3pl-in { transform: scale(1.08); filter: blur(8px); }
        .c3pl-mark { display: flex; align-items: center; gap: clamp(22px, 4vw, 54px); font-weight: 900; letter-spacing: -.035em; font-size: clamp(34px, 7.4vw, 96px); line-height: 1; }
        .c3pl-word { display: inline-flex; overflow: hidden; padding: .06em 0; }
        .c3pl-word span { display: inline-block; transform: translateY(105%); opacity: 0; filter: blur(6px); animation: c3pl-rise .7s cubic-bezier(.22,1,.36,1) forwards; }
        .c3pl-num { position: relative; display: inline-flex; align-items: flex-start; color: #FF5B0A; min-width: 2.35em; justify-content: center; opacity: 0; animation: c3pl-pop .5s .42s cubic-bezier(.22,1,.36,1) forwards; font-variant-numeric: tabular-nums; }
        .c3pl-digits { position: relative; z-index: 1; }
        .c3pl-deg { font-size: .6em; line-height: .9; margin-left: .04em; position: relative; z-index: 1; }
        .c3pl-ring { position: absolute; width: 2.55em; height: 2.55em; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(-90deg); overflow: visible; }
        .c3pl-ring circle { fill: none; stroke-width: 2.2; }
        .c3pl-ring .track { stroke: rgba(255,91,10,.14); }
        .c3pl-ring .arc { stroke: #FF5B0A; stroke-linecap: round; stroke-dasharray: 339.3; stroke-dashoffset: 339.3; animation: c3pl-sweep 1.3s .45s cubic-bezier(.33,1,.68,1) forwards; filter: drop-shadow(0 0 6px rgba(255,91,10,.55)); }
        .c3pl-sub { font-family: -apple-system, 'SF Pro Text', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: .32em; text-transform: uppercase; color: rgba(255,255,255,.55); opacity: 0; animation: c3pl-fade .6s .9s ease forwards; padding-left: .32em; }
        .c3pl-bar { width: min(220px, 50vw); height: 2px; border-radius: 2px; background: rgba(255,255,255,.1); overflow: hidden; opacity: 0; animation: c3pl-fade .4s 1.1s ease forwards; }
        .c3pl-bar span { display: block; height: 100%; width: 40%; background: linear-gradient(90deg, transparent, #FF5B0A, transparent); animation: c3pl-slide 1.1s ease-in-out infinite; }
        @keyframes c3pl-rise { to { transform: none; opacity: 1; filter: none; } }
        @keyframes c3pl-pop { from { opacity: 0; transform: scale(.7); } to { opacity: 1; transform: none; } }
        @keyframes c3pl-sweep { to { stroke-dashoffset: 0; } }
        @keyframes c3pl-fade { to { opacity: 1; } }
        @keyframes c3pl-slide { from { transform: translateX(-110%); } to { transform: translateX(260%); } }
        @media (prefers-reduced-motion: reduce) {
          .c3pl-word span, .c3pl-num, .c3pl-sub, .c3pl-bar { animation: none; opacity: 1; transform: none; filter: none; }
          .c3pl-ring .arc { animation: none; stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}
