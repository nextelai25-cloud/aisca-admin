import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDuplicates() {
  const { data, error } = await supabase.from('finance_ledger').select('*')
  if (error) {
    console.error("Error fetching data", error)
    return
  }

  const grouped = {}
  data.forEach(row => {
    // group by date, amount, category, description
    const key = `${row.date}_${row.amount}_${row.category}_${row.description}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(row.id)
  })

  let duplicateCount = 0
  const duplicateSets = []

  for (const [key, ids] of Object.entries(grouped)) {
    if (ids.length > 1) {
      duplicateCount += ids.length - 1
      duplicateSets.push({ key, count: ids.length, ids })
    }
  }

  console.log(`Total rows: ${data.length}`)
  console.log(`Total distinct rows (by date+amount+category+desc): ${Object.keys(grouped).length}`)
  console.log(`Number of duplicated rows: ${duplicateCount}`)
  
  if (duplicateCount > 0) {
    console.log("Sample duplicates:", duplicateSets.slice(0, 5))
  }
}

checkDuplicates()
