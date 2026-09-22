'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Camera, CameraOff, CheckCircle2, XCircle, AlertTriangle, Keyboard, ScanLine } from 'lucide-react'
import RangeelaTabs, { RangeelaGlassStyles } from '../RangeelaTabs'
import { rgApi, fmtTime, type RgMe } from '@/lib/rangeela-client'

type Result = 'admitted' | 'already_used' | 'not_approved' | 'invalid'
interface ScanTicket {
  ticket_number: string; full_name: string; school: string; al_batch: string; nic: string
  payment_method: string; status: string; checked_in_at: string | null; checked_in_by: string | null
}
interface ScanResponse { result: Result; ticket?: ScanTicket; message?: string; error?: string }

const LOOK: Record<Result, { bg: string; title: string; icon: React.ElementType }> = {
  admitted:     { bg: '#16A34A', title: 'VALID · LET THEM IN', icon: CheckCircle2 },
  already_used: { bg: '#DC2626', title: 'ALREADY USED', icon: XCircle },
  not_approved: { bg: '#D97706', title: 'NOT APPROVED', icon: AlertTriangle },
  invalid:      { bg: '#4B5563', title: 'INVALID CODE', icon: XCircle },
}

export default function ScanPage() {
  const [me, setMe] = useState<RgMe | null>(null)
  const [meError, setMeError] = useState('')
  const [running, setRunning] = useState(false)
  const [camError, setCamError] = useState('')
  const [checking, setChecking] = useState(false)
  const [last, setLast] = useState<ScanResponse | null>(null)
  const [manual, setManual] = useState('')
  const [admittedCount, setAdmittedCount] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const pausedRef = useRef(false)
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: '', at: 0 })
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    rgApi<{ me: RgMe; error?: string }>('me').then((r) => (r.ok ? setMe(r.data.me) : setMeError(r.data?.error || 'Not allowed')))
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function beep(ok: boolean) {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctx()
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.frequency.value = ok ? 880 : 220; o.type = ok ? 'sine' : 'square'
      g.gain.value = 0.15; o.connect(g); g.connect(ctx.destination)
      o.start(); o.stop(ctx.currentTime + (ok ? 0.15 : 0.45))
    } catch {}
    try { navigator.vibrate?.(ok ? 120 : [200, 100, 200]) } catch {}
  }

  const check = useCallback(async (code: string) => {
    pausedRef.current = true
    setChecking(true)
    const r = await rgApi<ScanResponse>('scan', { code })
    setChecking(false)
    const res: ScanResponse = r.ok ? r.data : { result: 'invalid', message: r.data?.error || 'Could not check this code. Check the internet connection.' }
    setLast(res)
    beep(res.result === 'admitted')
    if (res.result === 'admitted') {
      setAdmittedCount((n) => n + 1)
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
      dismissTimer.current = setTimeout(() => next(), 3500)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function next() {
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    setLast(null)
    pausedRef.current = false
  }

  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && !pausedRef.current) {
      const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight))
      const w = Math.round(video.videoWidth * scale)
      const h = Math.round(video.videoHeight * scale)
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h)
        const img = ctx.getImageData(0, 0, w, h)
        const found = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })
        if (found?.data) {
          const now = Date.now()
          const same = found.data === lastCodeRef.current.code && now - lastCodeRef.current.at < 4000
          if (!same) {
            lastCodeRef.current = { code: found.data, at: now }
            check(found.data)
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [check])

  async function start() {
    setCamError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('This browser cannot open the camera. Use Chrome or Safari, and make sure the dashboard is opened over https.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      streamRef.current = stream
      const v = videoRef.current!
      v.srcObject = stream
      v.setAttribute('playsinline', 'true')
      await v.play()
      pausedRef.current = false
      setRunning(true)
      rafRef.current = requestAnimationFrame(tick)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setCamError(/denied|permission|notallowed/i.test(msg)
        ? 'Camera permission was blocked. Allow camera access for this site in your browser settings, then try again.'
        : `Could not open the camera: ${msg}`)
    }
  }

  function stop() {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setRunning(false)
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault()
    const v = manual.trim()
    if (!v) return
    setManual('')
    check(v)
  }

  if (meError) return <div className="rg-page"><RangeelaGlassStyles /><div className="rg-glass p-6 text-sm text-red-600">{meError}</div></div>
  if (me && !me.can.scan) return (
    <div className="rg-page space-y-4"><RangeelaTabs me={me} subtitle="Entrance scanner" />
      <div className="rg-glass p-6 text-sm text-[#6B5E68]">Your account cannot scan tickets.</div></div>
  )

  const look = last ? LOOK[last.result] : null

  return (
    <div className="rg-page space-y-4 max-w-xl mx-auto">
      <RangeelaTabs me={me} subtitle="Scan each QR at the entrance. A ticket can be admitted only once." />

      <div className="rg-glass flex items-center justify-between px-5 py-3">
        <span className="text-[13px] font-semibold text-[#6B5E68]">Admitted on this device</span>
        <span className="text-2xl font-bold text-green-600">{admittedCount}</span>
      </div>

      <div className="relative rounded-[28px] overflow-hidden bg-[#140d18] aspect-square" style={{ boxShadow: '0 20px 50px -20px rgba(40,10,60,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)' }}>
        <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <ScanLine size={46} className="text-white/60" />
            <button onClick={start} className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-white text-[#1B1320] font-bold text-base shadow-lg active:scale-95 transition-transform">
              <Camera size={18} /> Start scanning
            </button>
            {camError && <p className="text-xs text-red-300 max-w-xs">{camError}</p>}
          </div>
        )}

        {running && !last && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-2/3 aspect-square rounded-3xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            {checking && <div className="absolute bottom-6 px-4 py-2 rounded-full bg-black/70 text-white text-xs font-semibold">Checking...</div>}
          </div>
        )}

        {last && look && (
          <button onClick={next} className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white" style={{ background: look.bg }}>
            <look.icon size={64} strokeWidth={2.5} />
            <div className="text-3xl font-black mt-3 tracking-tight">{look.title}</div>
            {last.ticket ? (
              <div className="mt-4 space-y-1">
                <div className="text-2xl font-bold">{last.ticket.full_name}</div>
                <div className="text-sm opacity-90">{last.ticket.school} · {last.ticket.al_batch}</div>
                <div className="text-sm opacity-90 font-mono">{last.ticket.ticket_number} · NIC {last.ticket.nic}</div>
                {last.result === 'already_used' && last.ticket.checked_in_at && (
                  <div className="mt-3 px-4 py-2 rounded-xl bg-black/25 text-sm font-semibold">
                    First scanned {fmtTime(last.ticket.checked_in_at)}<br />by {last.ticket.checked_in_by}
                  </div>
                )}
                {last.result === 'admitted' && <div className="mt-3 text-sm opacity-90">Check their NIC matches.</div>}
              </div>
            ) : (
              <div className="mt-3 text-sm opacity-90">{last.message}</div>
            )}
            {last.result !== 'admitted' && last.message && last.ticket && <div className="mt-2 text-sm opacity-90">{last.message}</div>}
            <div className="mt-6 px-5 py-2.5 rounded-full bg-white/20 text-sm font-bold">Tap to scan next</div>
          </button>
        )}
      </div>

      {running && (
        <button onClick={stop} className="rg-btn rg-btn-ghost w-full">
          <CameraOff size={15} /> Stop camera
        </button>
      )}

      <form onSubmit={submitManual} className="rg-glass p-4 space-y-2">
        <div className="rg-label flex items-center gap-2"><Keyboard size={13} /> Phone died or QR will not scan?</div>
        <p className="text-[13px] text-[#6B5E68]">Type the ticket number from their email (for example RG26-12345) and check their NIC carefully.</p>
        <div className="flex gap-2">
          <input value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} placeholder="RG26-12345" inputMode="text"
            className="rg-input flex-1 font-mono" autoCapitalize="characters" autoCorrect="off" />
          <button type="submit" disabled={checking} className="rg-btn rg-btn-dark">Check</button>
        </div>
      </form>
    </div>
  )
}
