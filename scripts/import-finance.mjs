import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load env
const envContent = readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)$/)
  if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
})

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Get chairman admin user id
const { data: chairman } = await sb
  .from('admin_users')
  .select('id')
  .eq('role', 'chairman')
  .single()

const chairmanId = chairman?.id || null
const today = '2026-05-29'

// =====================
// INCOME ENTRIES
// Merchandise pack collections from members
// =====================
const incomeEntries = [
  { name: 'Sethmin Rajapakse', amount: 2500 },
  { name: 'Saumya Nethmini Weerasingha', amount: 2500 },
  { name: 'Risin Dissanayake', amount: 2500 },
  { name: 'PKT Imandi Koralage', amount: 2500 },
  { name: 'K.A.Kovida Guwani Thiloththama', amount: 3740 },
  { name: 'Mohomed Eshaan', amount: 3740 },
  { name: 'Seruwaran Dimuthu Kaveesha', amount: 4000 },
  { name: 'Dahamsa Gunarathna', amount: 3740 },
  { name: 'Dimuthu Balasuriya', amount: 4000 },
  { name: 'Mohamed Khalifa Jiffy Khan', amount: 3740 },
  { name: 'A.A Akein Dias', amount: 4000 },
  { name: 'A.B. Fernando', amount: 4000 },
  { name: 'Santhu Anupama Sembacuttige', amount: 4000 },
  { name: 'Thenuki Nissanka', amount: 3740 },
  { name: 'Mayomi Ishara', amount: 2500 },
  { name: 'K.R.Abhiru Kareendra Sri Bandara', amount: 4000 },
  { name: 'Ahnaf Ajwad', amount: 3740 },
  { name: 'Dileesha Fernando', amount: 2500 },
  { name: 'Chanuri De Silva', amount: 4000 },
  { name: 'Nameetha Savindi Loku Umagiliyage', amount: 4000 },
  { name: 'Matheesha Ranasinghe', amount: 2500 },
  { name: 'Himasha Tharuneth', amount: 2500 },
  { name: 'Vasudevan Nimshi Grangel', amount: 3740 },
  { name: 'W. Joel Bevan', amount: 3740 },
  { name: 'Sanuli Harischandra', amount: 2500 },
  { name: 'Sasitha Yansilu', amount: 1390 },
  { name: 'Sesath Gunasekera', amount: 4000 },
  { name: 'R.D. Thashmika Navodya', amount: 2500 },
  { name: 'Davindu Rodrigo', amount: 2500 },
  { name: 'Sachindra Ratnayake', amount: 2500 },
  { name: 'Sehandu The Smitha Ranganath', amount: 4000 },
  { name: 'Mohamed Shakeel', amount: 3740 },
  { name: 'Dinidu Pasan De Silva Jayawardena', amount: 3740 },
  { name: 'GB Umesha Gannewa', amount: 1390 },
  { name: 'Chanithu Pasandul Soysa', amount: 4000 },
  { name: 'W. Nimesh Hirushan', amount: 4000 },
  { name: 'Nipun Nadunka', amount: 1390 },
  { name: 'Vishmi Others Wijemanne', amount: 4000 },
  { name: 'Risindi Vidunika Gunesekera', amount: 3740 },
  { name: 'Lehara Rajapakse', amount: 2500 },
  { name: 'Pawani Kathriarachchi', amount: 4000 },
  { name: 'Arya Panawala', amount: 2500 },
  { name: 'Ranuth Thewmitha', amount: 2500 },
  { name: 'Kaviesha Navinan', amount: 2500 },
  { name: 'Thesanya Hasandie', amount: 2500 },
  { name: 'Janiru Wijekoon', amount: 2500 },
  { name: 'Desandu Gunewardhena', amount: 2500 },
  { name: 'Okitha Wijesiri', amount: 2500 },
  { name: 'Isira Chirayu', amount: 4000 },
].map(e => ({
  type: 'income',
  category: 'Product Sales',
  description: `Merchandise Pack Collection - ${e.name}`,
  amount: e.amount,
  date: today,
  cash_or_bank: 'cash',
  recorded_by: chairmanId,
  adjusted: false
}))

// Gift a Smile other income
const otherIncome = [
  {
    type: 'income',
    category: 'Event Registration Fees',
    description: 'Gift a Smile Campaign - Contributions (Desandu, Ranuth, Vishmi, Risindi, Isira, Janiru)',
    amount: 13200,
    date: today,
    cash_or_bank: 'cash',
    recorded_by: chairmanId,
    adjusted: false
  }
]

// =====================
// EXPENSE ENTRIES - Official expenses only
// =====================
const expenseEntries = [
  { description: 'T-Shirts Procurement (Merchandise Pack)', amount: 85800, category: 'Equipment & Supplies' },
  { description: 'Gift a Smile Campaign - Supplies & Materials', amount: 18750, category: 'Charity & CSR' },
  { description: 'Drinks - Shoreline Beach Cleanup', amount: 1270, category: 'Food & Beverages' },
  { description: 'Banner Transportation - Shoreline Beach Cleanup', amount: 700, category: 'Transportation' },
  { description: 'Garbage Bags - Shoreline Beach Cleanup', amount: 1000, category: 'Equipment & Supplies' },
  { description: 'Hand Gloves - Shoreline Beach Cleanup', amount: 1400, category: 'Equipment & Supplies' },
  { description: 'Water Bottles - Shoreline Beach Cleanup', amount: 1000, category: 'Food & Beverages' },
  { description: 'Wristbands with Delivery - Merchandise', amount: 20000, category: 'Equipment & Supplies' },
  { description: 'Blazer Pins Procurement - Merchandise', amount: 33100, category: 'Equipment & Supplies' },
  { description: 'Blazer Pins Delivery', amount: 1200, category: 'Transportation' },
  { description: 'Courier Bags - Merchandise Distribution', amount: 1610, category: 'Equipment & Supplies' },
  { description: 'Membership Cards Printing', amount: 500, category: 'Printing & Stationery' },
  { description: 'Post Packaging - Name Tags & Sellotape', amount: 320, category: 'Printing & Stationery' },
  { description: 'Delivery for AISCA Merchandise Distribution', amount: 4200, category: 'Transportation' },
  { description: 'Gift a Smile - Drinks for Junior Students', amount: 1000, category: 'Food & Beverages' },
].map(e => ({
  type: 'expense',
  category: e.category,
  description: e.description,
  amount: e.amount,
  date: today,
  cash_or_bank: 'cash',
  recorded_by: chairmanId,
  adjusted: false
}))

// =====================
// PERSONAL CONTRIBUTIONS
// These are recorded as income (reimbursements) to balance the books
// They cover the gap between official expenses (165,040) and total expenses (171,850)
// =====================
const personalContributions = [
  {
    type: 'income',
    category: 'Donations',
    description: 'Personal Contribution - Sathis Gangaboda (Gift a Smile Drinks)',
    amount: 1000,
    date: today,
    cash_or_bank: 'cash',
    recorded_by: chairmanId,
    adjusted: false
  },
  {
    type: 'income',
    category: 'Donations',
    description: 'Personal Contribution - Isira Chirayu (Courier Bags & Courier Charges)',
    amount: 5810,
    date: today,
    cash_or_bank: 'cash',
    recorded_by: chairmanId,
    adjusted: false
  }
]

const allEntries = [...incomeEntries, ...otherIncome, ...personalContributions, ...expenseEntries]

console.log(`Importing ${allEntries.length} finance entries...`)
console.log(`  Income entries: ${incomeEntries.length + otherIncome.length + personalContributions.length}`)
console.log(`  Expense entries: ${expenseEntries.length}`)

const { data, error } = await sb
  .from('finance_ledger')
  .insert(allEntries)
  .select()

if (error) {
  console.error('Import error:', error.message)
} else {
  console.log(`✅ Successfully imported ${data.length} entries`)
  
  const totalIncome = allEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalExpenses = allEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const merchandiseIncome = incomeEntries.reduce((s, e) => s + e.amount, 0)
  const giftaSmileIncome = otherIncome.reduce((s, e) => s + e.amount, 0)
  const personalContribTotal = personalContributions.reduce((s, e) => s + e.amount, 0)

  console.log(`\n=== FINANCE SUMMARY ===`)
  console.log(`Merchandise Pack Income: LKR ${merchandiseIncome.toLocaleString()}`)
  console.log(`Gift a Smile Contributions: LKR ${giftaSmileIncome.toLocaleString()}`)
  console.log(`Personal Contributions (Sathis + Isira): LKR ${personalContribTotal.toLocaleString()}`)
  console.log(`Total Income: LKR ${totalIncome.toLocaleString()}`)
  console.log(`Total Expenses: LKR ${totalExpenses.toLocaleString()}`)
  console.log(`Net Balance: LKR ${(totalIncome - totalExpenses).toLocaleString()}`)
  console.log(`Cash in Hand: LKR 3,470`)
  console.log(`Realizable Income (unsold stock): LKR 41,200`)
}
