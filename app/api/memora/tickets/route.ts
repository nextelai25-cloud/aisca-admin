import { NextRequest, NextResponse } from 'next/server'
import { svc, getCaller, mmCan, mmPermissionsFor } from '@/lib/memora-server'

export const dynamic = 'force-dynamic'

// GET /api/memora/tickets → every ticket + recent scans + caller permissions
export async function GET(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !mmCan(caller.role, 'view')) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const [{ data: tickets, error }, { data: scans }] = await Promise.all([
    svc().from('memora_tickets').select('*').order('created_at', { ascending: false }).limit(5000),
    svc().from('memora_scans').select('*').order('scanned_at', { ascending: false }).limit(200),
  ])
  if (error) {
    console.error('[memora/tickets] fetch error:', error.message)
    return NextResponse.json({ error: 'Could not load tickets. Has supabase/memora.sql been run?' }, { status: 500 })
  }
  return NextResponse.json({
    tickets: tickets || [],
    scans: scans || [],
    me: { email: caller.email, name: caller.name, role: caller.role, can: mmPermissionsFor(caller.role) },
  })
}
