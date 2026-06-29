import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function POST(req: NextRequest) {
  try {
    const { subject, html } = await req.json()
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, token)
    
    const { data: subscribers, error: fetchError } = await supabase
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
    const emails = subscribers.map((sub: any) => ({
      from: process.env.RESEND_FROM_EMAIL || 'AISCA <noreply@aisca.lk>',
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
