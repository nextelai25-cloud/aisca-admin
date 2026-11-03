import { Resend } from 'resend'
import QRCode from 'qrcode'
import { MM, MM_QR_PREFIX } from './memora-server'
import { esc } from './rangeela-email'

// MEMORA '26 emails sent from the admin dashboard:
//   1. the QR ticket (after a bank receipt is approved, or a cash sale)
//   2. a friendly note when a receipt could not be verified
// Night blue and gold, matching the "request received" email from aisca.lk.

const SANS = 'Arial,Helvetica,sans-serif'
const SERIF = "Georgia,'Times New Roman',serif"
const GOLD = '#E8B54A'
const NAVY = '#0B1230'

function shell(inner: string, preheader: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MEMORA '26</title></head>
<body style="margin:0;padding:0;background:#060A1C;font-family:${SANS};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#060A1C;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${NAVY};border-radius:18px;overflow:hidden;border:1px solid #2A3360;">
  <tr><td style="background:${GOLD};height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td align="center" style="background:#05070F;">
    <img src="${MM.site}/memora/email-header.jpg" width="600" alt="MEMORA '26 A Day to Remember" style="display:block;width:100%;max-width:600px;height:auto;font-family:${SERIF};font-size:28px;color:${GOLD};" />
  </td></tr>
  ${inner}
  <tr><td style="padding:24px 32px 26px;border-top:1px solid #222B55;" align="center">
    <p style="margin:0 0 6px;font-size:12px;color:#9AA3C7;font-family:${SANS};">Questions? WhatsApp ${MM.helpContacts.map(c => `<a href="https://wa.me/${c.whatsapp}" style="color:${GOLD};text-decoration:none;font-weight:bold;">${c.name} ${c.label}</a>`).join(' or ')}</p>
    <p style="margin:0;font-size:11px;color:#6E77A0;font-family:${SANS};">All Island Schools Commerce Association · <a href="${MM.site}" style="color:#6E77A0;">aisca.lk</a></p>
  </td></tr>
  <tr><td style="background:${GOLD};height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

function fromAddress(): string {
  const f = process.env.RESEND_FROM_EMAIL
  const addr = f && !f.includes('resend.dev') ? (f.match(/<([^>]+)>/)?.[1] || f) : 'noreply@aisca.lk'
  return `MEMORA '26 by AISCA <${addr}>`
}

function whatsappBlock(): string {
  return `<tr><td style="padding:10px 32px 8px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0E2A1C;border:1px solid #1F6B43;border-radius:14px;">
    <tr><td style="padding:18px 22px;">
      <p style="margin:0 0 6px;font-size:15px;font-weight:bold;color:#BBF7D0;font-family:${SANS};">Join the MEMORA '26 WhatsApp group</p>
      <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#A7C7B4;font-family:${SANS};">Event day updates, reminders and last minute details are shared here first. If you have not joined yet, please do.</p>
      <a href="${MM.whatsappGroup}" style="display:inline-block;background:#25D366;color:#FFFFFF;padding:11px 22px;border-radius:999px;font-size:13px;font-weight:bold;text-decoration:none;font-family:${SANS};">Join the WhatsApp group</a>
    </td></tr>
  </table>
</td></tr>`
}

const cell = (label: string, value: string) =>
  `<td width="33%" style="padding:11px 4px;text-align:center;background:#121A40;border-radius:12px;border:1px solid #26305E;"><p style="margin:0;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#8790B8;font-family:${SANS};">${label}</p><p style="margin:4px 0 0;font-size:14px;font-weight:bold;color:${GOLD};font-family:${SANS};">${value}</p></td>`

export interface MmTicketEmailInput {
  to: string
  name: string
  ticketNumber: string
  school: string
  nic: string
  token: string
  paymentMethod: 'bank' | 'cash'
  amount: number
}

export async function sendMemoraTicketEmail(t: MmTicketEmailInput): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY is not set on the admin server' }

  const qrPng = await QRCode.toBuffer(`${MM_QR_PREFIX}${t.token}`, {
    type: 'png', width: 480, margin: 2, errorCorrectionLevel: 'M',
    color: { dark: NAVY, light: '#FFFFFF' },
  })
  const ticketUrl = `${MM.site}/memora26/ticket/${t.token}`
  const first = esc((t.name || 'there').split(' ')[0])
  const paid = `LKR ${t.amount.toLocaleString()} · ${t.paymentMethod === 'cash' ? 'paid in cash' : 'paid by bank transfer'}`

  const inner = `
  <tr><td style="padding:26px 32px 6px;">
    <h1 style="margin:0 0 12px;font-size:25px;line-height:1.3;color:#FFFFFF;font-family:${SERIF};font-weight:normal;">You are in, ${first}.</h1>
    <p style="margin:0 0 6px;font-size:14.5px;line-height:1.7;color:#C3C9E4;font-family:${SANS};">Your payment is confirmed and your ticket for MEMORA '26 is ready. Keep this email safe and show the QR code below at the entrance.</p>
  </td></tr>

  <tr><td style="padding:14px 28px 6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid ${GOLD};border-radius:20px;background:#0E1538;">
      <tr><td style="padding:22px 22px 6px;" align="center">
        <p style="margin:0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#8790B8;font-family:${SANS};">Admit one</p>
        <p style="margin:6px 0 2px;font-size:24px;color:#FFFFFF;font-family:${SERIF};">${esc(t.name)}</p>
        <p style="margin:0;font-size:13px;color:#9AA3C7;font-family:${SANS};">${esc(t.school)}</p>
      </td></tr>
      <tr><td style="padding:14px 16px 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          ${cell('Date', MM.dateShort)}<td width="4"></td>${cell('Time', MM.time)}<td width="4"></td>${cell('Venue', MM.venue)}
        </tr></table>
      </td></tr>
      <tr><td style="padding:18px 18px 0;"><div style="border-top:2px dashed #3A4478;height:0;line-height:0;font-size:0;">&nbsp;</div></td></tr>
      <tr><td align="center" style="padding:20px 20px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;"><tr><td style="padding:12px;">
          <img src="cid:memora-qr" width="210" height="210" alt="Your MEMORA '26 entry QR code" style="display:block;width:210px;height:210px;border:0;" />
        </td></tr></table>
        <p style="margin:12px 0 0;font-size:20px;font-weight:bold;color:${GOLD};font-family:'Courier New',monospace;letter-spacing:1px;">${esc(t.ticketNumber)}</p>
        <p style="margin:6px 0 0;font-size:12px;color:#9AA3C7;font-family:${SANS};">NIC: ${esc(t.nic)} · ${esc(paid)}</p>
      </td></tr>
      <tr><td align="center" style="padding:14px 22px 22px;">
        <p style="margin:0 0 12px;font-size:12.5px;line-height:1.6;color:#C3C9E4;font-family:${SANS};">This QR code works for <strong style="color:#FFFFFF;">one entry only</strong>. Once it is scanned at the entrance it cannot be used again.</p>
        <a href="${ticketUrl}" style="display:inline-block;background:${GOLD};color:#1A1206;padding:11px 24px;border-radius:999px;font-size:13px;font-weight:bold;text-decoration:none;font-family:${SANS};">Open my ticket online</a>
        <p style="margin:10px 0 0;font-size:11px;color:#6E77A0;font-family:${SANS};">Use this if the QR image above does not show.</p>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:18px 32px 6px;">
    <p style="margin:0 0 10px;font-size:15px;font-weight:bold;color:#FFFFFF;font-family:${SANS};">Before you come</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${[
        'Bring your NIC. Your name and NIC number may be checked with this ticket.',
        'Please do not share or post your QR code. Anyone who scans it first uses your entry.',
        'Tickets are non refundable and non transferable.',
        `The night begins at 4.00 PM at ${MM.venue}. Plan your ride home in advance.`,
      ].map((t) => `<tr><td width="18" valign="top" style="padding:6px 0;"><div style="width:8px;height:8px;border-radius:50%;background:${GOLD};margin-top:6px;"></div></td><td style="padding:6px 0;font-size:13.5px;line-height:1.6;color:#C3C9E4;font-family:${SANS};">${t}</td></tr>`).join('')}
    </table>
  </td></tr>
  ${whatsappBlock()}
  <tr><td style="padding:14px 32px 8px;">
    <p style="margin:0;font-size:13.5px;line-height:1.7;color:#C3C9E4;font-family:${SANS};">See you on ${MM.dateLabel}, ${MM.time}, at ${MM.venue}.<br/><strong style="color:#FFFFFF;">Team AISCA</strong></p>
  </td></tr>`

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: t.to,
      subject: `Your MEMORA '26 ticket is here (${t.ticketNumber})`,
      html: shell(inner, `Your QR ticket for ${MM.dateShort} at ${MM.venue}. Show it at the entrance.`),
      attachments: [{ filename: `MEMORA26-${t.ticketNumber}-QR.png`, content: qrPng.toString('base64'), contentType: 'image/png', contentId: 'memora-qr' }],
    })
    if (error) return { ok: false, error: error.message || JSON.stringify(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function sendMemoraRejectedEmail(to: string, name: string, ticketNumber: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY is not set on the admin server' }
  const first = esc((name || 'there').split(' ')[0])

  const inner = `
  <tr><td style="padding:26px 32px 10px;">
    <h1 style="margin:0 0 12px;font-size:23px;line-height:1.3;color:#FFFFFF;font-family:${SERIF};font-weight:normal;">Hi ${first}, we need a little help</h1>
    <p style="margin:0 0 14px;font-size:14.5px;line-height:1.7;color:#C3C9E4;font-family:${SANS};">We checked your MEMORA '26 ticket request (<strong style="color:#FFFFFF;">${esc(ticketNumber)}</strong>) but could not confirm the payment from the receipt you sent.</p>
    ${reason ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#2A1E0C;border:1px solid #8A6420;border-radius:12px;"><tr><td style="padding:14px 18px;font-size:13.5px;line-height:1.6;color:#F3D99A;font-family:${SANS};"><strong>Note from our team:</strong> ${esc(reason)}</td></tr></table>` : ''}
    <p style="margin:16px 0 14px;font-size:14.5px;line-height:1.7;color:#C3C9E4;font-family:${SANS};">This is usually easy to fix. Please fill the ticket form again with a clear photo of your bank receipt, or message us on WhatsApp and we will sort it out with you.</p>
    <p style="margin:0 0 18px;"><a href="${MM.site}/memora26#tickets" style="display:inline-block;background:${GOLD};color:#1A1206;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:bold;text-decoration:none;font-family:${SANS};">Go to the ticket form</a></p>
    <p style="margin:0;font-size:13.5px;line-height:1.7;color:#C3C9E4;font-family:${SANS};">Thank you for your patience.<br/><strong style="color:#FFFFFF;">Team AISCA</strong></p>
  </td></tr>`

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to,
      subject: `About your MEMORA '26 ticket request (${ticketNumber})`,
      html: shell(inner, 'We could not confirm your payment yet. Here is how to fix it.'),
    })
    if (error) return { ok: false, error: error.message || JSON.stringify(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
