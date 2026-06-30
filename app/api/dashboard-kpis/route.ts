import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // 1. Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]

    // 2. Authenticate user using the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Fetch user role securely from admin_users
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('email', user.email)
      .single()
      
    if (!adminUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userRole = adminUser.role // e.g. 'chairman', 'cfo', 'marketing_manager'
    const isExecutive = ['chairman', 'cfo'].includes(userRole)

    // 4. Calculate Fund Balance entirely on the server
    // (Using the user's token context so RLS applies if present)
    const { data: ledger } = await supabase
      .from('finance_ledger')
      .select('type, amount')
      .eq('adjusted', false)
      
    let balance = 0
    if (ledger) {
      ledger.forEach(entry => {
        if (entry.type === 'income') balance += Number(entry.amount)
        if (entry.type === 'expense') balance -= Number(entry.amount)
      })
    }

    // 5. Determine badge status
    let statusText = 'Critical'
    if (balance > 50000) statusText = 'Healthy'
    else if (balance >= 10000) statusText = 'Tight'

    // 6. Return restricted payload
    return NextResponse.json({
      fundStatus: {
        badge: statusText,
        // The exact_balance field is strictly omitted for non-executives!
        ...(isExecutive ? { exact_balance: balance } : {})
      }
    })

  } catch (err) {
    console.error('Fund API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
