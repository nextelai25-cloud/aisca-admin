'use server'

import { supabaseAdmin } from '@/lib/supabase'

export async function sendPaymentVerifiedTelegram(orderNumber: string, productName: string, customerName: string, amount: number) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram env vars missing in admin')
    return
  }

  const text = `✅ *PAYMENT VERIFIED*\n\nOrder: ${orderNumber}\nProduct: ${productName}\nCustomer: ${customerName}\nAmount: LKR ${amount}`

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown'
      })
    })
  } catch (err) {
    console.error('Failed to send Telegram msg:', err)
  }
}
