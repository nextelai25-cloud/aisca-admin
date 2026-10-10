import { NextRequest, NextResponse } from 'next/server'
import { svc, getCaller, can } from '@/lib/rangeela-server'

export const dynamic = 'force-dynamic'

// POST /api/rangeela/amount { id, amount, reason? } → chairman only.
// Changes the amount on one ticket that is already in the system (e.g. 1,200 → 1,000).
// Every change is written into the ticket's notes: old → new, who, when, why.
export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !can(caller.role, 'amount')) return NextResponse.json({ error: 'Only the chairman can change a ticket amount.' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const id = String(b.id ?? '')
  const amount = Number(b.amount)
  const reason = String(b.reason ?? '').trim().slice(0, 200)
  if (!id) return NextResponse.json({ error: 'Missing ticket.' }, { status: 400 })
  if (!Number.isInteger(amount) || amount < 0 || amount > 100000) {
    return NextResponse.json({ error: 'Enter a whole number between 0 and 100,000.' }, { status: 400 })
  }

  const { data: t, error: e1 } = await svc().from('rangeela_tickets').select('id, amount, notes').eq('id', id).maybeSingle()
  if (e1 || !t) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })
  const prev = Number(t.amount)
  if (prev === amount) return NextResponse.json({ error: 'That is already the amount on this ticket.' }, { status: 400 })

  const when = new Date().toLocaleString('en-LK', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' })
  const line = `Amount changed LKR ${prev.toLocaleString()} → LKR ${amount.toLocaleString()} by ${caller.email} on ${when}${reason ? ` (${reason})` : ''}.`
  const notes = [t.notes, line].filter(Boolean).join(' · ').slice(0, 4000)

  const { data: updated, error: e2 } = await svc()
    .from('rangeela_tickets')
    .update({ amount, notes })
    .eq('id', id)
    .eq('amount', t.amount) // skip if someone else changed it at the same moment
    .select('*')
    .maybeSingle()
  if (e2) {
    console.error('[rangeela/amount] update error:', e2.message)
    return NextResponse.json({ error: 'Could not save the amount.' }, { status: 500 })
  }
  if (!updated) return NextResponse.json({ error: 'This ticket was changed by someone else just now. Refresh and try again.' }, { status: 409 })
  return NextResponse.json({ ticket: updated })
}
