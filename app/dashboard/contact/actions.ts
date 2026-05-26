'use server'
import { supabaseAdmin } from '@/lib/supabase'

export async function getUnreadContactMessagesCount() {
  const { count } = await supabaseAdmin
    .from('contact_messages')
    .select('*', { count: 'exact', head: true })
    .eq('read', false)
  return count || 0
}

export async function markContactMessageRead(id: string) {
  await supabaseAdmin
    .from('contact_messages')
    .update({ read: true })
    .eq('id', id)
}
