// MEMORA '26 ticket SMS, sent through the same QuickSend account as RANGEELA.
import { sendSms } from './rangeela-sms'

export { toLocalMobile } from './rangeela-sms'

/** The "here is your ticket" SMS. Kept under 160 characters for normal names. */
export function memoraSmsText(name: string, ticketNumber: string, token: string): string {
  const first = (name || '').trim().split(/\s+/)[0]?.slice(0, 12) || 'there'
  return `Hi ${first}, your MEMORA '26 ticket ${ticketNumber} is confirmed! See you 15 Nov, 4 PM at Rock House. Ticket: aisca.lk/m/${token}`
}

/** Sends the ticket SMS and returns the fields to store on the ticket row. */
export async function sendMemoraSms(t: { whatsapp: string; full_name: string; ticket_number: string }, token: string) {
  const r = await sendSms(t.whatsapp, memoraSmsText(t.full_name, t.ticket_number, token))
  return {
    result: r,
    patch: r.ok
      ? { sms_sent_at: new Date().toISOString(), sms_error: null }
      : { sms_error: r.error || 'SMS failed' },
  }
}
