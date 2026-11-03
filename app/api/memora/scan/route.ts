import { NextRequest, NextResponse } from 'next/server'
import { svc, getCaller, mmCan, MM_QR_PREFIX } from '@/lib/memora-server'

export const dynamic = 'force-dynamic'

// GET /api/memora/scan → how many people are inside, across every phone
export async function GET(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !(mmCan(caller.role, 'scan') || mmCan(caller.role, 'view'))) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const [{ count: inside }, { count: issued }] = await Promise.all([
    svc().from('memora_tickets').select('id', { count: 'exact', head: true }).not('checked_in_at', 'is', null),
    svc().from('memora_tickets').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
  ])
  return NextResponse.json({ inside: inside ?? 0, issued: issued ?? 0 })
}

// POST /api/memora/scan { code }
// code = the scanned QR text ("MEMORA26:<token>") or a typed ticket number
// ("MM26-12345"). Check in is a single conditional UPDATE, so even if two
// phones scan the same QR at the same moment only one admits.
export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !mmCan(caller.role, 'scan')) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const { code } = await req.json().catch(() => ({ code: '' }))
  const raw = String(code ?? '').trim()

  let column: 'qr_token' | 'ticket_number'
  let value: string
  const qr = raw.match(new RegExp(`^${MM_QR_PREFIX}([a-f0-9]{32})$`, 'i'))
  const num = raw.toUpperCase().replace(/\s/g, '').match(/^(?:MM26-?)?(\d{5})$/)
  if (qr) { column = 'qr_token'; value = qr[1].toLowerCase() }
  else if (num) { column = 'ticket_number'; value = `MM26-${num[1]}` }
  else {
    await log(null, raw, 'invalid', caller.email)
    const other = /^RANGEELA26:/i.test(raw) ? " This is a RANGEELA '26 ticket, not MEMORA." : ''
    return NextResponse.json({ result: 'invalid', message: `This is not a MEMORA '26 ticket.${other}` })
  }

  const fields = 'id, ticket_number, full_name, school, al_batch, nic, email, whatsapp, payment_method, status, checked_in_at, checked_in_by'
  const now = new Date().toISOString()
  const { data: admitted } = await svc()
    .from('memora_tickets')
    .update({ checked_in_at: now, checked_in_by: caller.email })
    .eq(column, value)
    .eq('status', 'approved')
    .is('checked_in_at', null)
    .select(fields)
    .maybeSingle()

  if (admitted) {
    await log(admitted.id, value, 'admitted', caller.email)
    return NextResponse.json({ result: 'admitted', ticket: admitted })
  }

  const { data: t } = await svc().from('memora_tickets').select(fields).eq(column, value).maybeSingle()
  if (!t) {
    await log(null, value, 'invalid', caller.email)
    return NextResponse.json({ result: 'invalid', message: 'No ticket matches this code.' })
  }
  if (t.status !== 'approved') {
    await log(t.id, value, 'not_approved', caller.email)
    return NextResponse.json({ result: 'not_approved', ticket: t, message: t.status === 'pending' ? 'Payment not verified yet.' : 'This ticket was rejected or cancelled.' })
  }
  await log(t.id, value, 'already_used', caller.email)
  return NextResponse.json({ result: 'already_used', ticket: t })
}

async function log(ticketId: string | null, code: string, result: string, by: string) {
  try {
    await svc().from('memora_scans').insert([{ ticket_id: ticketId, code: code.slice(0, 12), result, scanned_by: by }])
  } catch {}
}
