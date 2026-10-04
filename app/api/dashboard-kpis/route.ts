import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAll } from '@/lib/fetch-all'

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error('Fund API Error: SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }
    // Server-only client. The caller's identity is verified below before any data is read.
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    // 1. Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]

    // 2. Authenticate user using the token
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Resolve role: admin_users first, then the role stored on the auth account
    const { data: adminUser } = await admin
      .from('admin_users')
      .select('role')
      .ilike('email', user.email || '')
      .maybeSingle()

    const userRole: string | undefined = adminUser?.role || user.user_metadata?.role
    if (!userRole) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const isExecutive = ['chairman', 'cfo'].includes(userRole)

    // 4. Fund balance from every unadjusted ledger entry (paged past the 1,000-row limit)
    const ledger = await fetchAll<{ type: string; amount: number }>(
      admin, 'finance_ledger', 'id, type, amount', q => q.eq('adjusted', false)
    )

    let balance = 0
    for (const entry of ledger) {
      if (entry.type === 'income') balance += Number(entry.amount)
      if (entry.type === 'expense') balance -= Number(entry.amount)
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
