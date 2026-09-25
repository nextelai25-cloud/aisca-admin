// RANGEELA '26 ticket SMS through the QuickSend gateway (quicksend.lk).
//
// Needs these on the admin server (.env.local):
//   QUICKSEND_EMAIL      the email address of the QuickSend account
//   QUICKSEND_API_KEY    the API key from the QuickSend dashboard
//   QUICKSEND_SENDER_ID  approved sender name, "ORIGINS" for now, "AISCA" later
// If the email or key is missing, SMS is skipped quietly and email still works.

const API = 'https://quicksend.lk/Client/api.php?FUN=SEND_SINGLE'

/** Turns any Sri Lankan mobile format into 07XXXXXXXX, or null if it is not one. */
export function toLocalMobile(raw: string): string | null {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.startsWith('0094')) d = d.slice(2)
  if (d.length === 11 && d.startsWith('94')) d = '0' + d.slice(2)
  if (d.length === 9 && d.startsWith('7')) d = '0' + d
  return /^07\d{8}$/.test(d) ? d : null
}

export function smsConfigured(): boolean {
  return !!(process.env.QUICKSEND_EMAIL && process.env.QUICKSEND_API_KEY)
}

export async function sendSms(to: string, msg: string): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const email = process.env.QUICKSEND_EMAIL
  const key = process.env.QUICKSEND_API_KEY
  if (!email || !key) return { ok: false, skipped: true, error: 'SMS is not set up on the admin server yet' }

  const phone = toLocalMobile(to)
  if (!phone) return { ok: false, error: `Not a Sri Lankan mobile number: ${to}` }

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${email}:${key}`).toString('base64'),
      },
      body: JSON.stringify({ senderID: process.env.QUICKSEND_SENDER_ID || 'ORIGINS', to: phone, msg }),
      signal: AbortSignal.timeout(15000),
    })
    const text = (await res.text()).slice(0, 300)
    if (!res.ok) return { ok: false, error: `QuickSend ${res.status}: ${text}` }
    // QuickSend replies with a short status message. Treat obvious failure words as an error.
    if (/error|fail|invalid|insufficient|unauthori[sz]ed|not allowed/i.test(text)) return { ok: false, error: `QuickSend: ${text}` }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** The "here is your ticket" SMS. Kept under 160 characters for normal names. */
export function ticketSmsText(name: string, ticketNumber: string, token: string): string {
  const first = (name || '').trim().split(/\s+/)[0]?.slice(0, 12) || 'there'
  return `Hi ${first}, your RANGEELA '26 ticket ${ticketNumber} is confirmed! See you 17 Oct, 3 PM at Hyde Park. Your ticket: aisca.lk/r/${token}`
}

/** Sends the ticket SMS and returns the fields to store on the ticket row. */
export async function sendTicketSms(t: { whatsapp: string; full_name: string; ticket_number: string }, token: string) {
  const r = await sendSms(t.whatsapp, ticketSmsText(t.full_name, t.ticket_number, token))
  return {
    result: r,
    patch: r.ok
      ? { sms_sent_at: new Date().toISOString(), sms_error: null }
      : { sms_error: r.error || 'SMS failed' },
  }
}
