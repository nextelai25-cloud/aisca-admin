import { NextRequest, NextResponse } from 'next/server'
import { svc, getCaller, can, EMAIL_RE } from '@/lib/rangeela-server'
import { sendTicketEmail } from '@/lib/rangeela-email'
import { sendTicketSms } from '@/lib/rangeela-sms'

// POST /api/rangeela/resend { id, email? }
// Sends the same QR ticket again. If the student typed the wrong email,
// pass the corrected one and it is saved first. The QR code stays the same.
export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !can(caller.role, 'edit')) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'Missing ticket id' }, { status: 400 })

  const { data: t } = await svc().from('rangeela_tickets').select('*').eq('id', id).maybeSingle()
  if (!t) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  let email: string = t.email
  if (typeof body.email === 'string' && body.email.trim()) {
    const e = body.email.trim().toLowerCase()
    if (!EMAIL_RE.test(e)) return NextResponse.json({ error: 'That email address does not look right.' }, { status: 400 })
    email = e
    if (email !== t.email) await svc().from('rangeela_tickets').update({ email }).eq('id', id)
  }

  if (t.status !== 'approved' || !t.qr_token) {
    return NextResponse.json({ ok: true, emailed: false, ticket: { ...t, email }, note: 'Email saved. The ticket is not approved yet, so nothing was sent.' })
  }

  const sent = await sendTicketEmail({
    to: email, name: t.full_name, ticketNumber: t.ticket_number, school: t.school,
    nic: t.nic, token: t.qr_token, paymentMethod: t.payment_method, amount: Number(t.amount),
  })
  const patch = sent.ok ? { ticket_emailed_at: new Date().toISOString(), email_error: null } : { email_error: sent.error || 'Email failed' }
  await svc().from('rangeela_tickets').update(patch).eq('id', id)

  const sms = await sendTicketSms(t, t.qr_token)
  const { error: smsDbErr } = await svc().from('rangeela_tickets').update(sms.patch).eq('id', id)
  const smsPatch = smsDbErr ? {} : sms.patch

  return NextResponse.json({
    ok: true, emailed: sent.ok, emailError: sent.error || null,
    sms: sms.result.ok, smsSkipped: !!sms.result.skipped, smsError: sms.result.ok ? null : sms.result.error || null,
    ticket: { ...t, email, ...patch, ...smsPatch },
  })
}
