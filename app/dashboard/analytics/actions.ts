'use server'
import { supabaseAdmin } from '@/lib/supabase'

export async function getAnalytics() {
  // Fetch total page views
  const { count: totalViews } = await supabaseAdmin
    .from('site_analytics')
    .select('*', { count: 'exact', head: true })

  // Fetch unique sessions
  const { data: sessions } = await supabaseAdmin
    .from('site_analytics')
    .select('session_id')

  // Fetch top pages
  const { data: pageData } = await supabaseAdmin
    .from('site_analytics')
    .select('page')
    //.order('visited_at', { ascending: false })
    .limit(500)

  // Fetch devices
  const { data: deviceData } = await supabaseAdmin
    .from('site_analytics')
    .select('device')

  // Fetch all data for timeline, referrers, and geo
  const { data: allData } = await supabaseAdmin
    .from('site_analytics')
    .select('*')
    .order('created_at', { ascending: true })

  return {
    totalViews: totalViews || 0,
    sessions: sessions || [],
    pageData: pageData || [],
    deviceData: deviceData || [],
    allData: allData || []
  }
}
