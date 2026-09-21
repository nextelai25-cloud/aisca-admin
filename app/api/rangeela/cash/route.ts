import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { svc, getCaller, can, newQrToken, normaliseId, looksLikeNic, EMAIL_RE } from '@/lib/rangeela-server'
import { sendTicketEmail } from '@/lib/rangeela-email'

const PRICE = 1200

// POST /api/rangeela/cash
// { full_name, email, whatsapp, school, al_batch, nic, amount?, notes?, admit_now? }
// Cash desk sale: saved as approved straight away and the QR ticket is
// emailed immediately. With admit_now (gate sales) it is also checked in.
export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !can(caller.role, 'cash')) return NextResponse.json({ error: 'Only the cash desk account can record cash sales.' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const full_name = String(b.full_name ?? '').trim().slice(0, 200)
  const email = String(b.email ?? '').trim().toLowerCase()
  const whatsapp = String(b.whatsapp ?? '').trim().slice(0, 30)
  const school = String(b.school ?? '').trim().slice(0, 200)
  const al_batch = String(b.al_batch ?? '').trim().slice(0, 40)
  const nic = String(b.nic ?? '').trim().toUpperCase().slice(0, 30)
  const amount = Number(b.amount ?? PRICE)
  const admitNow = b.admit_now === true

  if (!full_name) return NextResponse.json({ error: 'Enter the full name.' }, { status: 400 })
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  if (whatsapp.replace(/\D/g, '').length < 9) return NextResponse.json({ error: 'Enter a valid WhatsApp number.' }, { status: 400 })
  if (!school) return NextResponse.json({ error: 'Enter the school.' }, { status: 400 })
  if (!al_batch) return NextResponse.json({ error: 'Choose the A/L batch.' }, { status: 400 })
  const nic_norm = normaliseId(nic)
  if (nic_norm.length < 4) return NextResponse.json({ error: 'Enter the NIC or school ID number.' }, { status: 400 })
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) return NextResponse.json({ error: 'Check the amount.' }, { status: 400 })

  const now = new Date().toISOString()
  const token = newQrToken()
  const base = {
    full_name, email, whatsapp, school, al_batch, nic, nic_norm, nic_is_nic: looksLikeNic(nic),
    payment_method: 'cash', amount, source: 'cash_desk', notes: String(b.notes ?? '').trim().slice(0, 500) || null,
    status: 'approved', qr_token: token, approved_by: caller.email, approved_at: now, created_by: caller.email,
    ...(admitNow ? { checked_in_at: now, checked_in_by: caller.email } : {}),
  }

  let t: Record<string, any> | null = null
  for (let attempt = 0; attempt < 5 && !t; attempt++) {
    const ticket_number = `RG26-${randomInt(10000, 100000)}`
    const { data, error } = await svc().from('rangeela_tickets').insert([{ ...base, ticket_number }]).select('*').single()
    if (!error) { t = data; break }
    if (error.code === '23505' && /nic/i.test(error.message)) {
      return NextResponse.json({ error: 'This NIC already has a live ticket. Search for it in the list before selling another.' }, { status: 409 })
    }
    if (error.code !== '23505') {
      console.error('[rangeela/cash] insert error:', error.message)
      return NextResponse.json({ error: 'Could not save the sale.' }, { status: 500 })
    }
  }
  if (!t) return NextResponse.json({ error: 'Could not save the sale.' }, { status: 500 })

  if (admitNow) {
    await svc().from('rangeela_scans').insert([{ ticket_id: t.id, code: t.ticket_number, result: 'admitted', scanned_by: caller.email }])
  }

  const sent = await sendTicketEmail({
    to: email, name: full_name, ticketNumber: t.ticket_number, school, nic, token, paymentMethod: 'cash', amount,
  })
  const patch = sent.ok ? { ticket_emailed_at: new Date().toISOString(), email_error: null } : { email_error: sent.error || 'Email failed' }
  await svc().from('rangeela_tickets').update(patch).eq('id', t.id)

  return NextResponse.json({ ok: true, emailed: sent.ok, emailError: sent.error || null, ticket: { ...t, ...patch } })
}
