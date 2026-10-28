import { NextRequest, NextResponse } from 'next/server'
import { svc, getCaller, can, QR_PREFIX, PAPER_MAX } from '@/lib/rangeela-server'

export const dynamic = 'force-dynamic'

// GET /api/rangeela/scan → how many people are inside, across every gate
export async function GET(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !(can(caller.role, 'scan') || can(caller.role, 'view'))) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const [{ count: online }, { count: paper }] = await Promise.all([
    svc().from('rangeela_tickets').select('id', { count: 'exact', head: true }).not('checked_in_at', 'is', null),
    svc().from('rangeela_paper_entries').select('number', { count: 'exact', head: true }),
  ])
  return NextResponse.json({ online: online ?? 0, paper: paper ?? 0, paperMax: PAPER_MAX })
}

// POST /api/rangeela/scan { code }
// code = the scanned QR text ("RANGEELA26:<token>") or a typed ticket
// number ("RG26-12345"), or a paper ticket number ("001" to "200"). Check in is a single conditional UPDATE, so even
// if two gates scan the same QR at the same moment only one admits.
export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !can(caller.role, 'scan')) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const { code } = await req.json().catch(() => ({ code: '' }))
  const raw = String(code ?? '').trim()

  let column: 'qr_token' | 'ticket_number'
  let value: string
  const qr = raw.match(new RegExp(`^${QR_PREFIX}([a-f0-9]{32})$`, 'i'))
  const num = raw.toUpperCase().replace(/\s/g, '').match(/^(?:RG26-?)?(\d{5})$/)
  const paper = raw.toUpperCase().replace(/\s/g, '').match(/^(?:NO\.?|#|P-?)?(\d{1,3})$/)
  if (qr) { column = 'qr_token'; value = qr[1].toLowerCase() }
  else if (num) { column = 'ticket_number'; value = `RG26-${num[1]}` }
  else if (paper) return paperEntry(Number(paper[1]), caller.email)
  else {
    await log(null, raw, 'invalid', caller.email)
    return NextResponse.json({ result: 'invalid', message: 'This is not a RANGEELA \'26 ticket.' })
  }

  const fields = 'id, ticket_number, full_name, school, al_batch, nic, email, whatsapp, payment_method, status, checked_in_at, checked_in_by'
  const now = new Date().toISOString()
  const { data: admitted } = await svc()
    .from('rangeela_tickets')
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

  const { data: t } = await svc().from('rangeela_tickets').select(fields).eq(column, value).maybeSingle()
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

// Paper ticket: inserting the number is the check in. The primary key means
// a number that is already in the table can never be admitted twice.
async function paperEntry(n: number, by: string) {
  const label = String(n).padStart(3, '0')
  if (n < 1 || n > PAPER_MAX) {
    await log(null, `PAPER-${label}`, 'invalid', by)
    return NextResponse.json({ result: 'invalid', message: `Paper tickets are numbered 001 to ${String(PAPER_MAX).padStart(3, '0')}.` })
  }
  const { data, error } = await svc()
    .from('rangeela_paper_entries')
    .insert([{ number: n, entered_by: by }])
    .select('entered_at, entered_by')
    .maybeSingle()
  if (data) {
    await log(null, `PAPER-${label}`, 'admitted', by)
    return NextResponse.json({ result: 'admitted', paper: { number: label, ...data } })
  }
  if (error?.code === '23505') {
    const { data: first } = await svc().from('rangeela_paper_entries').select('entered_at, entered_by').eq('number', n).maybeSingle()
    await log(null, `PAPER-${label}`, 'already_used', by)
    return NextResponse.json({ result: 'already_used', paper: { number: label, entered_at: first?.entered_at ?? null, entered_by: first?.entered_by ?? null } })
  }
  console.error('[rangeela/scan] paper entry error:', error?.message)
  return NextResponse.json({ error: 'Could not record this paper ticket. Has supabase/rangeela-paper.sql been run?' }, { status: 500 })
}

async function log(ticketId: string | null, code: string, result: string, by: string) {
  try {
    await svc().from('rangeela_scans').insert([{ ticket_id: ticketId, code: code.slice(0, 12), result, scanned_by: by }])
  } catch {}
}
