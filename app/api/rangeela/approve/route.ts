import { NextRequest, NextResponse } from 'next/server'
import { svc, getCaller, can, newQrToken } from '@/lib/rangeela-server'
import { sendTicketEmail } from '@/lib/rangeela-email'
import { sendTicketSms } from '@/lib/rangeela-sms'

// POST /api/rangeela/approve { id }
// Marks the bank receipt as verified, creates the one time QR token and
// emails the ticket. Safe against double clicks: only a pending or
// rejected ticket can be approved, and the update is conditional.
export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !can(caller.role, 'approve')) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const { id } = await req.json().catch(() => ({}))
  if (!id || typeof id !== 'string') return NextResponse.json({ error: 'Missing ticket id' }, { status: 400 })

  const token = newQrToken()
  const { data: t, error } = await svc()
    .from('rangeela_tickets')
    .update({
      status: 'approved', qr_token: token, reject_reason: null,
      approved_by: caller.email, approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .in('status', ['pending', 'rejected'])
    .select('*')
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Another live ticket already exists for this NIC. Check for a duplicate before approving.' }, { status: 409 })
    }
    console.error('[rangeela/approve] update error:', error.message)
    return NextResponse.json({ error: 'Could not approve this ticket.' }, { status: 500 })
  }
  if (!t) return NextResponse.json({ error: 'This ticket was already approved by someone else. Refresh the list.' }, { status: 409 })

  const sent = await sendTicketEmail({
    to: t.email, name: t.full_name, ticketNumber: t.ticket_number, school: t.school,
    nic: t.nic, token, paymentMethod: t.payment_method, amount: Number(t.amount),
  })
  const patch = sent.ok
    ? { ticket_emailed_at: new Date().toISOString(), email_error: null }
    : { email_error: sent.error || 'Email failed' }
  await svc().from('rangeela_tickets').update(patch).eq('id', t.id)

  // "Here is your ticket" SMS with the online ticket link (best effort).
  const sms = await sendTicketSms(t, token)
  const { error: smsDbErr } = await svc().from('rangeela_tickets').update(sms.patch).eq('id', t.id)
  const smsPatch = smsDbErr ? {} : sms.patch

  return NextResponse.json({
    ok: true, emailed: sent.ok, emailError: sent.error || null,
    sms: sms.result.ok, smsSkipped: !!sms.result.skipped, smsError: sms.result.ok ? null : sms.result.error || null,
    ticket: { ...t, ...patch, ...smsPatch },
  })
}
