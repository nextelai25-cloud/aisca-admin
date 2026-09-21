import { NextRequest, NextResponse } from 'next/server'
import { svc, getCaller, can } from '@/lib/rangeela-server'
import { sendRejectedEmail } from '@/lib/rangeela-email'

// POST /api/rangeela/reject { id, reason, notify }
// Pending tickets can be rejected by any approver. Revoking an already
// approved ticket (which kills its QR code) is chairman only.
export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !can(caller.role, 'approve')) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const id = typeof body.id === 'string' ? body.id : ''
  const reason = String(body.reason ?? '').trim().slice(0, 500)
  const notify = body.notify !== false
  if (!id) return NextResponse.json({ error: 'Missing ticket id' }, { status: 400 })

  const { data: current } = await svc().from('rangeela_tickets').select('*').eq('id', id).maybeSingle()
  if (!current) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  if (current.status === 'rejected') return NextResponse.json({ error: 'Already rejected' }, { status: 409 })
  if (current.status === 'approved') {
    if (!can(caller.role, 'revoke')) return NextResponse.json({ error: 'Only the chairman can cancel an approved ticket.' }, { status: 403 })
    if (current.checked_in_at) return NextResponse.json({ error: 'This ticket has already been used at the entrance.' }, { status: 409 })
  }

  const { data: t, error } = await svc()
    .from('rangeela_tickets')
    .update({ status: 'rejected', reject_reason: reason || null, qr_token: null })
    .eq('id', id)
    .eq('status', current.status)
    .select('*')
    .maybeSingle()
  if (error || !t) return NextResponse.json({ error: 'Could not update this ticket. Refresh and try again.' }, { status: 409 })

  let emailed = false
  let emailError: string | null = null
  if (notify) {
    const r = await sendRejectedEmail(t.email, t.full_name, t.ticket_number, reason)
    emailed = r.ok
    emailError = r.error || null
  }
  return NextResponse.json({ ok: true, emailed, emailError, ticket: t })
}
