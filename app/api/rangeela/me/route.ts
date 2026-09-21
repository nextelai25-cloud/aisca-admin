import { NextRequest, NextResponse } from 'next/server'
import { getCaller, can, permissionsFor } from '@/lib/rangeela-server'

export const dynamic = 'force-dynamic'

// GET /api/rangeela/me → who am I and what can I do on the Rangeela pages
export async function GET(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !can(caller.role, 'view')) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  return NextResponse.json({ me: { email: caller.email, name: caller.name, role: caller.role, can: permissionsFor(caller.role) } })
}
