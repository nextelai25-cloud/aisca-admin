import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { subject, html } = await req.json()
    
    const { data: subscribers, error: fetchError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('email, name')
      .eq('active', true)
    
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }
    
    if (!subscribers?.length) {
      return NextResponse.json({ error: 'No subscribers found' }, { status: 400 })
    }
    
    // Send in batches of 50
    const emails = subscribers.map(sub => ({
      from: 'AISCA <onboarding@resend.dev>',
      to: sub.email,
      subject,
      html
    }))
    
    const { data, error } = await resend.batch.send(emails)
    
    if (error) {
      console.error("Resend batch send error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, sent: emails.length })
  } catch (err: any) {
    console.error("Internal server error in newsletter send route:", err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
