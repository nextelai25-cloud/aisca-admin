import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load env manually
const envPath = path.join(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)$/)
  if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
})

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const fileBuffer = readFileSync(path.join(__dirname, 'AISCA_MASTER_DATABASE.xlsx'))
const wb = XLSX.read(fileBuffer, { type: 'buffer' })
const ws = wb.Sheets['Master Database']
const rows = XLSX.utils.sheet_to_json(ws)

console.log(`Importing ${rows.length} members...`)

const batchSize = 50
for (let i = 0; i < rows.length; i += batchSize) {
  const batch = rows.slice(i, i + batchSize).map(r => ({
    aisca_id: r['AISCA_ID'] || null,
    full_name: r['Full_Name'] || '',
    email: r['Email'] || null,
    phone: r['Phone']?.toString() || null,
    school: r['School'] || null,
    al_batch: r['A/L_Batch'] || null,
    district: r['District'] || null,
    member_type: r['Member_Type'] || null,
    member_type_detail: r['Member_Type_Detail'] || null,
    birthday: r['Birthday'] ? new Date(r['Birthday']).toISOString().split('T')[0] : null,
    gender: r['Gender'] || null,
    first_activity_date: r['First_Activity_Date'] ? new Date(r['First_Activity_Date']).toISOString().split('T')[0] : null,
    latest_activity_date: r['Latest_Activity_Date'] ? new Date(r['Latest_Activity_Date']).toISOString().split('T')[0] : null,
    total_forms_submitted: r['Total_Forms_Submitted'] || 0,
    total_events_attended: r['Total_Events_Attended'] || 0,
    total_projects_attended: r['Total_Projects_Attended'] || 0,
    participation_score: r['Participation_Score'] || 0,
    appeared_in_forum: r['Appeared_In_Forum'] === 'Yes',
    appeared_in_board_system: r['Appeared_In_Board_System'] === 'Yes',
    appeared_in_beach_cleanup: r['Appeared_In_Beach_Cleanup'] === 'Yes',
    appeared_in_economics_seminar: r['Appeared_In_Economics_Seminar'] === 'Yes',
    appeared_in_associate_form: r['Appeared_In_Associate_Form'] === 'Yes',
    appeared_in_official_database: r['Appeared_In_Official_Database'] === 'Yes',
    data_sources: r['Data_Sources'] || null,
    merge_confidence: r['Merge_Confidence'] || null
  }))

  const { error } = await sb.from('aisca_members').upsert(batch, { onConflict: 'aisca_id' })
  if (error) console.error(`Batch ${i/batchSize + 1} error:`, error.message)
  else console.log(`Imported batch ${i/batchSize + 1}: ${batch.length} records`)
}

console.log('Import complete!')
