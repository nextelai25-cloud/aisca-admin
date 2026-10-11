// Creates (or updates) the Public Relations login: pr@aisca.lk, Lehara Rajapakse.
//
//   Run from the aisca-admin folder, AFTER supabase/pr-role.sql has been run:
//     Windows PowerShell:  $env:PR_PASSWORD="choose-a-strong-password"; node scripts/create-pr-account.mjs
//     macOS / Linux:       PR_PASSWORD="choose-a-strong-password" node scripts/create-pr-account.mjs
//
// The password is never written to disk by this script. It only ADDS or
// UPDATES this one account and never touches or deletes any other admin.
//
// Access (lib/roles.ts → public_relations): Dashboard, COMMERCE 360 with full
// control, Associates, Schools, Newsletter, Contact, IdeaNet, NextUp, Analytics.
// No Finance, Orders, Members or Rangeela.

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const env = {}
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, '')
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.PR_PASSWORD || ''
if (!url || !key) { console.error('Missing Supabase URL or service role key in .env.local'); process.exit(1) }
if (password.length < 10) { console.error('Set PR_PASSWORD (at least 10 characters) before running.'); process.exit(1) }

const A = { email: 'pr@aisca.lk', name: 'Lehara Rajapakse', role: 'public_relations' }
const supabase = createClient(url, key, { auth: { persistSession: false } })

// 1. admin_users row (this is what the server checks for permissions)
const { data: row } = await supabase.from('admin_users').select('id').eq('email', A.email).maybeSingle()
const dbRes = row
  ? await supabase.from('admin_users').update({ name: A.name, role: A.role }).eq('email', A.email)
  : await supabase.from('admin_users').insert({ email: A.email, name: A.name, role: A.role })
if (dbRes.error) {
  console.error(`✗ admin_users failed: ${dbRes.error.message}`)
  console.error('  Did you run supabase/pr-role.sql first? It allows the new role.')
  process.exit(1)
}

// 2. Supabase Auth login (role also stored in user_metadata for the dashboard menu)
let user = null
for (let page = 1; page < 50 && !user; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
  if (error) { console.error('Could not list users:', error.message); process.exit(1) }
  user = data.users.find((u) => (u.email || '').toLowerCase() === A.email) || null
  if (data.users.length < 200) break
}
const meta = { ...(user?.user_metadata || {}), name: A.name, role: A.role }
const res = user
  ? await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true, user_metadata: meta })
  : await supabase.auth.admin.createUser({ email: A.email, password, email_confirm: true, user_metadata: meta })
if (res.error) { console.error(`✗ login failed: ${res.error.message}`); process.exit(1) }

// 3. Add her to the COMMERCE 360 people roster if it exists (ignored if not set up)
await supabase.from('c360_people').update({ role: 'Public Relations', active: true }).eq('name', A.name)

console.log(`✓ ${A.email} (${A.role}) ${user ? 'updated' : 'created'}`)
console.log('\nDone. Lehara can log in at admin.aisca.lk with pr@aisca.lk and the password you set.')
console.log('She can change it any time in Settings.')
