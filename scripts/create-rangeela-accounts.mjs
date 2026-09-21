// Creates the RANGEELA '26 organising committee and cash desk logins.
//
//   Run from the aisca-admin folder, AFTER supabase/rangeela.sql has been run:
//     Windows PowerShell:  $env:RANGEELA_PASSWORD="choose-a-strong-password"; node scripts/create-rangeela-accounts.mjs
//     macOS / Linux:       RANGEELA_PASSWORD="choose-a-strong-password" node scripts/create-rangeela-accounts.mjs
//
// All five accounts get the same password, as agreed. The password is never
// written to disk by this script. It only ADDS or UPDATES these five
// accounts and never touches or deletes any other admin.
//
// Note: scripts/setup_auth.js in aisca-web deletes every @aisca.lk login that
// is not in its own list. Do not run that script again without adding these
// five accounts to its list first.

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env.local')
const env = {}
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, '')
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.RANGEELA_PASSWORD || ''
if (!url || !key) { console.error('Missing Supabase URL or service role key in .env.local'); process.exit(1) }
if (password.length < 10) { console.error('Set RANGEELA_PASSWORD (at least 10 characters) before running.'); process.exit(1) }

const ACCOUNTS = [
  { email: 'rangeelaoc1@aisca.lk', name: 'Rangeela OC 1', role: 'rangeela_oc' },
  { email: 'rangeelaoc2@aisca.lk', name: 'Rangeela OC 2', role: 'rangeela_oc' },
  { email: 'rangeelaoc3@aisca.lk', name: 'Rangeela OC 3', role: 'rangeela_oc' },
  { email: 'rangeelaoc4@aisca.lk', name: 'Rangeela OC 4', role: 'rangeela_oc' },
  { email: 'rangeelacash@aisca.lk', name: 'Rangeela Cash Desk', role: 'rangeela_cash' },
]

const supabase = createClient(url, key, { auth: { persistSession: false } })

const existing = []
for (let page = 1; page < 50; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
  if (error) { console.error('Could not list users:', error.message); process.exit(1) }
  existing.push(...data.users)
  if (data.users.length < 200) break
}

for (const a of ACCOUNTS) {
  // 1. admin_users row (this is what the server checks for permissions)
  const { data: row } = await supabase.from('admin_users').select('id').eq('email', a.email).maybeSingle()
  const dbRes = row
    ? await supabase.from('admin_users').update({ name: a.name, role: a.role }).eq('email', a.email)
    : await supabase.from('admin_users').insert({ email: a.email, name: a.name, role: a.role })
  if (dbRes.error) {
    console.error(`✗ ${a.email}: admin_users failed: ${dbRes.error.message}`)
    console.error('  Did you run supabase/rangeela.sql first? It allows the new roles.')
    continue
  }

  // 2. Supabase Auth login
  const user = existing.find((u) => (u.email || '').toLowerCase() === a.email)
  const res = user
    ? await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true, user_metadata: { ...(user.user_metadata || {}), name: a.name, role: a.role } })
    : await supabase.auth.admin.createUser({ email: a.email, password, email_confirm: true, user_metadata: { name: a.name, role: a.role } })
  if (res.error) console.error(`✗ ${a.email}: login failed: ${res.error.message}`)
  else console.log(`✓ ${a.email} (${a.role}) ${user ? 'updated' : 'created'}`)
}

console.log('\nDone. Log in at admin.aisca.lk with any of these emails and the password you set.')
