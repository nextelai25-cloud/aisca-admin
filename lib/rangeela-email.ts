import { Resend } from 'resend'
import QRCode from 'qrcode'
import { QR_PREFIX } from './rangeela-server'

// RANGEELA '26 emails sent from the admin dashboard:
//   1. the QR ticket (after a bank receipt is approved, or a cash sale)
//   2. a friendly note when a receipt could not be verified
// The layout matches the "request received" email sent by aisca.lk.

export const RG = {
  dateShort: '17th October',
  dateLabel: 'Saturday, 17th October 2026',
  time: '3.00 PM onwards',
  venue: 'Hyde Park Grounds',
  whatsappGroup: 'https://chat.whatsapp.com/HklcPlrIl3P6tKJsWDbxu8',
  helpWhatsapp: '94778132137',
  helpWhatsappLabel: '077 813 2137',
  site: 'https://aisca.lk',
}

const FONT = 'Arial,Helvetica,sans-serif'
const RAINBOW = ['#E6007E', '#FF4D2E', '#FF9F1C', '#FFD60A', '#2EC4B6', '#3A86FF', '#7B2FF7']

export function esc(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function rainbowBar(height = 6): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${RAINBOW.map(
    (c) => `<td style="background:${c};height:${height}px;font-size:0;line-height:0;">&nbsp;</td>`
  ).join('')}</tr></table>`
}

function shell(inner: string, preheader: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RANGEELA '26</title></head>
<body style="margin:0;padding:0;background:#FFF4EC;font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF4EC;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:18px;overflow:hidden;border:1px solid #F3E3F0;">
  <tr><td>${rainbowBar(6)}</td></tr>
  <tr><td align="center" style="padding:30px 28px 6px;background:#FFFDFB;">
    <img src="${RG.site}/rangeela/logo-email.png" width="300" alt="RANGEELA '26 A Celebration of Hues" style="display:block;width:300px;max-width:80%;height:auto;margin:0 auto;font-family:${FONT};font-size:26px;font-weight:bold;color:#E6007E;" />
    <p style="margin:14px 0 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8A7A86;font-family:${FONT};">All Island Schools Commerce Association</p>
  </td></tr>
  ${inner}
  <tr><td style="padding:26px 32px 28px;border-top:1px solid #F4EAF2;" align="center">
    <p style="margin:0 0 6px;font-size:12px;color:#8A7A86;font-family:${FONT};">Questions? Message AISCA on WhatsApp: <a href="https://wa.me/${RG.helpWhatsapp}" style="color:#7B2FF7;text-decoration:none;font-weight:bold;">${RG.helpWhatsappLabel}</a></p>
    <p style="margin:0;font-size:11px;color:#B3A5AF;font-family:${FONT};">All Island Schools Commerce Association · <a href="${RG.site}" style="color:#B3A5AF;">aisca.lk</a></p>
  </td></tr>
  <tr><td>${rainbowBar(6)}</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

function whatsappBlock(): string {
  return `<tr><td style="padding:8px 32px 8px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1FBF4;border:1px solid #CDEFD8;border-radius:14px;">
    <tr><td style="padding:20px 22px;">
      <p style="margin:0 0 6px;font-size:15px;font-weight:bold;color:#14532D;font-family:${FONT};">Join the RANGEELA '26 WhatsApp group</p>
      <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#3F6B4F;font-family:${FONT};">Event day updates, reminders and last minute details are shared here first. If you have not joined yet, please do.</p>
      <a href="${RG.whatsappGroup}" style="display:inline-block;background:#25D366;color:#FFFFFF;padding:11px 22px;border-radius:999px;font-size:13px;font-weight:bold;text-decoration:none;font-family:${FONT};">Join the WhatsApp group</a>
    </td></tr>
  </table>
</td></tr>`
}

function fromAddress(): string {
  const f = process.env.RESEND_FROM_EMAIL
  // RESEND_FROM_EMAIL may be a bare address or "Name <address>"
  const addr = f && !f.includes('resend.dev') ? (f.match(/<([^>]+)>/)?.[1] || f) : 'noreply@aisca.lk'
  return `RANGEELA '26 by AISCA <${addr}>`
}

export interface TicketEmailInput {
  to: string
  name: string
  ticketNumber: string
  school: string
  nic: string
  token: string
  paymentMethod: 'bank' | 'cash'
  amount: number
}

export async function sendTicketEmail(t: TicketEmailInput): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY is not set on the admin server' }

  const qrPng = await QRCode.toBuffer(`${QR_PREFIX}${t.token}`, {
    type: 'png', width: 480, margin: 2, errorCorrectionLevel: 'M',
    color: { dark: '#2B1B2E', light: '#FFFFFF' },
  })
  const ticketUrl = `${RG.site}/rangeela26/ticket/${t.token}`
  const first = esc((t.name || 'there').split(' ')[0])
  const paid = t.paymentMethod === 'cash' ? `LKR ${t.amount.toLocaleString()} · paid in cash` : `LKR ${t.amount.toLocaleString()} · paid by bank transfer`

  const inner = `
  <tr><td style="padding:24px 32px 6px;">
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#2B1B2E;font-family:${FONT};">You are in, ${first}!</h1>
    <p style="margin:0 0 6px;font-size:14.5px;line-height:1.7;color:#5B4A58;font-family:${FONT};">Your payment is confirmed and your ticket for RANGEELA '26 is ready. Keep this email safe and show the QR code below at the entrance.</p>
  </td></tr>

  <tr><td style="padding:14px 28px 6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #F0C9E2;border-radius:20px;background:#FFFBF7;">
      <tr><td style="padding:22px 22px 6px;" align="center">
        <p style="margin:0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#A07A95;font-family:${FONT};">Admit one</p>
        <p style="margin:6px 0 2px;font-size:24px;font-weight:bold;color:#2B1B2E;font-family:${FONT};">${esc(t.name)}</p>
        <p style="margin:0;font-size:13px;color:#8A7A86;font-family:${FONT};">${esc(t.school)}</p>
      </td></tr>
      <tr><td style="padding:14px 16px 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="33%" style="padding:10px 4px;text-align:center;background:#FFF1E6;border-radius:12px;"><p style="margin:0;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#A0826B;font-family:${FONT};">Date</p><p style="margin:4px 0 0;font-size:14px;font-weight:bold;color:#E0561B;font-family:${FONT};">${RG.dateShort}</p></td>
            <td width="4"></td>
            <td width="33%" style="padding:10px 4px;text-align:center;background:#FFEAF5;border-radius:12px;"><p style="margin:0;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#A07A95;font-family:${FONT};">Time</p><p style="margin:4px 0 0;font-size:14px;font-weight:bold;color:#E6007E;font-family:${FONT};">3.00 PM onwards</p></td>
            <td width="4"></td>
            <td width="33%" style="padding:10px 4px;text-align:center;background:#EEF3FF;border-radius:12px;"><p style="margin:0;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#6B7FA0;font-family:${FONT};">Venue</p><p style="margin:4px 0 0;font-size:14px;font-weight:bold;color:#2F6BFF;font-family:${FONT};">Hyde Park Grounds</p></td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:18px 18px 0;"><div style="border-top:2px dashed #EBD9E6;height:0;line-height:0;font-size:0;">&nbsp;</div></td></tr>
      <tr><td align="center" style="padding:20px 20px 4px;">
        <img src="cid:rangeela-qr" width="220" height="220" alt="Your RANGEELA '26 entry QR code" style="display:block;width:220px;height:220px;border:0;margin:0 auto;" />
        <p style="margin:12px 0 0;font-size:20px;font-weight:bold;color:#7B2FF7;font-family:'Courier New',monospace;letter-spacing:1px;">${esc(t.ticketNumber)}</p>
        <p style="margin:6px 0 0;font-size:12px;color:#8A7A86;font-family:${FONT};">NIC: ${esc(t.nic)} · ${esc(paid)}</p>
      </td></tr>
      <tr><td align="center" style="padding:14px 22px 22px;">
        <p style="margin:0 0 12px;font-size:12.5px;line-height:1.6;color:#5B4A58;font-family:${FONT};">This QR code works for <strong>one entry only</strong>. Once it is scanned at the gate it cannot be used again.</p>
        <a href="${ticketUrl}" style="display:inline-block;background:#2B1B2E;color:#FFFFFF;padding:11px 22px;border-radius:999px;font-size:13px;font-weight:bold;text-decoration:none;font-family:${FONT};">Open my ticket online</a>
        <p style="margin:10px 0 0;font-size:11px;color:#A898A4;font-family:${FONT};">Use this if the QR image above does not show.</p>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:18px 32px 6px;">
    <p style="margin:0 0 10px;font-size:15px;font-weight:bold;color:#2B1B2E;font-family:${FONT};">Before you come</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${[
        ['#E6007E', 'Wear white. It is the best canvas for the colours.'],
        ['#FF7A00', 'Colour packets are included with your ticket, along with music, a DJ, food stalls and games.'],
        ['#FFC300', 'Bring your NIC. Your name and NIC number may be checked with this ticket.'],
        ['#0FB5AE', 'Please do not share or post your QR code. Anyone who scans it first uses your entry.'],
        ['#7B2FF7', 'Tickets are non refundable and non transferable.'],
      ].map(([c, t]) => `<tr><td width="18" valign="top" style="padding:6px 0;"><div style="width:9px;height:9px;border-radius:50%;background:${c};margin-top:5px;"></div></td><td style="padding:6px 0;font-size:13.5px;line-height:1.6;color:#5B4A58;font-family:${FONT};">${t}</td></tr>`).join('')}
    </table>
  </td></tr>
  ${whatsappBlock()}
  <tr><td style="padding:14px 32px 8px;">
    <p style="margin:0;font-size:13.5px;line-height:1.7;color:#5B4A58;font-family:${FONT};">We cannot wait to celebrate with you. See you on ${RG.dateLabel}, ${RG.time}, at ${RG.venue}.<br/><strong style="color:#2B1B2E;">Team AISCA</strong></p>
  </td></tr>`

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: t.to,
      subject: `Your RANGEELA '26 ticket is here! (${t.ticketNumber})`,
      html: shell(inner, `Your QR ticket for 17th October at Hyde Park Grounds. Show it at the entrance.`),
      attachments: [{ filename: `RANGEELA26-${t.ticketNumber}-QR.png`, content: qrPng.toString('base64'), contentType: 'image/png', contentId: 'rangeela-qr' }],
    })
    if (error) return { ok: false, error: error.message || JSON.stringify(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function sendRejectedEmail(to: string, name: string, ticketNumber: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY is not set on the admin server' }
  const first = esc((name || 'there').split(' ')[0])

  const inner = `
  <tr><td style="padding:24px 32px 6px;">
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#2B1B2E;font-family:${FONT};">Hi ${first}, we need a little help</h1>
    <p style="margin:0 0 14px;font-size:14.5px;line-height:1.7;color:#5B4A58;font-family:${FONT};">We checked your RANGEELA '26 ticket request (<strong>${esc(ticketNumber)}</strong>) but could not confirm the payment from the receipt you sent.</p>
    ${reason ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF6EA;border:1px solid #FFD89A;border-radius:12px;"><tr><td style="padding:14px 18px;font-size:13.5px;line-height:1.6;color:#8A4B00;font-family:${FONT};"><strong>Note from our team:</strong> ${esc(reason)}</td></tr></table>` : ''}
    <p style="margin:16px 0 14px;font-size:14.5px;line-height:1.7;color:#5B4A58;font-family:${FONT};">No worries, this is usually easy to fix. Please fill the ticket form again with a clear photo of your bank receipt, or message us on WhatsApp and we will sort it out with you.</p>
    <p style="margin:0 0 18px;"><a href="${RG.site}/rangeela26#tickets" style="display:inline-block;background:#E6007E;color:#FFFFFF;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:bold;text-decoration:none;font-family:${FONT};">Go to the ticket form</a></p>
  </td></tr>
  ${whatsappBlock()}
  <tr><td style="padding:14px 32px 8px;">
    <p style="margin:0;font-size:13.5px;line-height:1.7;color:#5B4A58;font-family:${FONT};">Thank you for your patience.<br/><strong style="color:#2B1B2E;">Team AISCA</strong></p>
  </td></tr>`

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to,
      subject: `About your RANGEELA '26 ticket request (${ticketNumber})`,
      html: shell(inner, 'We could not confirm your payment yet. Here is how to fix it.'),
    })
    if (error) return { ok: false, error: error.message || JSON.stringify(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
