import { NextRequest, NextResponse } from 'next/server'
import { getCaller, mmCan, mmPermissionsFor } from '@/lib/memora-server'

export const dynamic = 'force-dynamic'

// GET /api/memora/me → who is logged in and what they can do on the MEMORA pages
export async function GET(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !mmCan(caller.role, 'view')) return NextResponse.json({ error: "This account cannot open MEMORA '26." }, { status: 403 })
  return NextResponse.json({ me: { email: caller.email, name: caller.name, role: caller.role, can: mmPermissionsFor(caller.role) } })
}
