import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { svc, getCaller, mmCan, newQrToken, normaliseId, looksLikeNic, EMAIL_RE, MM } from '@/lib/memora-server'
import { sendMemoraTicketEmail } from '@/lib/memora-email'
import { sendMemoraSms, toLocalMobile } from '@/lib/memora-sms'

// POST /api/memora/cash
// { full_name, email, whatsapp, school, al_batch, nic, amount?, notes?, admit_now? }
// Cash sale: saved as approved straight away and the QR ticket is emailed
// and sent by SMS immediately. With admit_now it is also checked in.
export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !mmCan(caller.role, 'cash')) return NextResponse.json({ error: 'Only the cash desk account can record cash sales.' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const full_name = String(b.full_name ?? '').trim().slice(0, 200)
  const email = String(b.email ?? '').trim().toLowerCase()
  const whatsapp = toLocalMobile(String(b.whatsapp ?? '')) || ''
  const school = String(b.school ?? '').trim().slice(0, 200)
  const al_batch = String(b.al_batch ?? '').trim().slice(0, 40)
  const nic = String(b.nic ?? '').trim().toUpperCase().slice(0, 30)
  const admitNow = b.admit_now === true
  const amount = Number(b.amount ?? MM.price)

  if (!full_name) return NextResponse.json({ error: 'Enter the full name.' }, { status: 400 })
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  if (!whatsapp) return NextResponse.json({ error: 'Enter a valid mobile number, like 077 123 4567.' }, { status: 400 })
  if (!school) return NextResponse.json({ error: 'Enter the school.' }, { status: 400 })
  if (!al_batch) return NextResponse.json({ error: 'Choose the A/L batch.' }, { status: 400 })
  if (!looksLikeNic(nic)) return NextResponse.json({ error: 'Enter a valid NIC number (12 digits, or 9 digits followed by V or X).' }, { status: 400 })
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) return NextResponse.json({ error: 'Check the amount.' }, { status: 400 })

  const now = new Date().toISOString()
  const token = newQrToken()
  const base = {
    full_name, email, whatsapp, school, al_batch, nic, nic_norm: normaliseId(nic),
    payment_method: 'cash', amount, source: 'cash_desk', notes: String(b.notes ?? '').trim().slice(0, 500) || null,
    status: 'approved', qr_token: token, approved_by: caller.email, approved_at: now, created_by: caller.email,
    ...(admitNow ? { checked_in_at: now, checked_in_by: caller.email } : {}),
  }

  let t: Record<string, unknown> & { id: string; ticket_number: string; amount: number } | null = null
  for (let attempt = 0; attempt < 5 && !t; attempt++) {
    const ticket_number = `MM26-${randomInt(10000, 100000)}`
    const { data, error } = await svc().from('memora_tickets').insert([{ ...base, ticket_number }]).select('*').single()
    if (!error) { t = data; break }
    if (error.code === '23505' && /nic/i.test(error.message)) {
      return NextResponse.json({ error: 'This NIC already has a live ticket. Search for it in the list before selling another.' }, { status: 409 })
    }
    if (error.code !== '23505') {
      console.error('[memora/cash] insert error:', error.message)
      return NextResponse.json({ error: 'Could not save the sale. Has supabase/memora.sql been run?' }, { status: 500 })
    }
  }
  if (!t) return NextResponse.json({ error: 'Could not save the sale.' }, { status: 500 })

  if (admitNow) {
    await svc().from('memora_scans').insert([{ ticket_id: t.id, code: t.ticket_number, result: 'admitted', scanned_by: caller.email }])
  }

  const sent = await sendMemoraTicketEmail({ to: email, name: full_name, ticketNumber: t.ticket_number, school, nic, token, paymentMethod: 'cash', amount })
  const patch = sent.ok ? { ticket_emailed_at: new Date().toISOString(), email_error: null } : { email_error: sent.error || 'Email failed' }
  await svc().from('memora_tickets').update(patch).eq('id', t.id)

  const sms = await sendMemoraSms({ whatsapp, full_name, ticket_number: t.ticket_number }, token)
  const { error: smsDbErr } = await svc().from('memora_tickets').update(sms.patch).eq('id', t.id)
  const smsPatch = smsDbErr ? {} : sms.patch

  return NextResponse.json({
    ok: true, emailed: sent.ok, emailError: sent.error || null,
    sms: sms.result.ok, smsSkipped: !!sms.result.skipped, smsError: sms.result.ok ? null : sms.result.error || null,
    ticket: { ...t, ...patch, ...smsPatch },
  })
}
