import { NextRequest, NextResponse } from 'next/server'
import { svc, getCaller, can, getRgPrices } from '@/lib/rangeela-server'

export const dynamic = 'force-dynamic'

const MIN = 100, MAX = 100000

// GET /api/rangeela/price → live prices, who changed them last, recent changes.
export async function GET(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !can(caller.role, 'view')) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const prices = await getRgPrices()
  const [{ data: row }, { data: log }] = await Promise.all([
    svc().from('rangeela_settings').select('updated_by, updated_at').eq('id', 1).maybeSingle(),
    svc().from('rangeela_price_log').select('*').order('changed_at', { ascending: false }).limit(5),
  ])
  return NextResponse.json({ ...prices, updated_by: row?.updated_by ?? null, updated_at: row?.updated_at ?? null, log: log ?? [] })
}

// POST /api/rangeela/price { standard, gate } → chairman only.
// The public page, new ticket requests, the cash desk and emails follow at once.
// Tickets already submitted keep the amount they paid.
export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !can(caller.role, 'price')) return NextResponse.json({ error: 'Only the chairman can change the ticket price.' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const standard = Number(b.standard), gate = Number(b.gate)
  for (const [label, v] of [['online', standard], ['gate', gate]] as const) {
    if (!Number.isInteger(v) || v < MIN || v > MAX) {
      return NextResponse.json({ error: `Enter a whole number between ${MIN} and ${MAX.toLocaleString()} for the ${label} price.` }, { status: 400 })
    }
  }

  const prev = await getRgPrices()
  const { error } = await svc().from('rangeela_settings').upsert({
    id: 1, online_price: standard, gate_price: gate, updated_by: caller.email, updated_at: new Date().toISOString(),
  })
  if (error) {
    console.error('[rangeela/price] update error:', error.message)
    const missing = /rangeela_settings/.test(error.message) && /exist|find/i.test(error.message)
    return NextResponse.json({ error: missing ? 'The price table is not set up yet. Run supabase/rangeela-price.sql in Supabase first.' : 'Could not save the price.' }, { status: 500 })
  }
  await svc().from('rangeela_price_log').insert({
    online_price: standard, gate_price: gate, prev_online: prev.standard, prev_gate: prev.gate, changed_by: caller.email,
  })
  return NextResponse.json({ standard, gate, updated_by: caller.email, updated_at: new Date().toISOString() })
}
