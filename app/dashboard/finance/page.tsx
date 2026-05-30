'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { 
  Download, 
  CircleDollarSign, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  MinusCircle,
  Calendar,
  X
} from 'lucide-react'

// Custom tooltip styling
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#121212] border border-white/10 p-3 rounded-lg shadow-xl text-xs">
        <p className="font-semibold text-gray-400 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="font-bold" style={{ color: p.color }}>
            {p.name}: LKR {Number(p.value).toLocaleString()}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const INCOME_CATEGORIES = [
  'Event Registration Fees',
  'Membership Fees',
  'Product Sales',
  'Sponsorship',
  'Donations',
  'Grants',
  'Other Income'
]

const EXPENSE_CATEGORIES = [
  'Food & Beverages',
  'Transportation',
  'Venue Hire',
  'Printing & Stationery',
  'Marketing & Promotions',
  'Awards & Trophies',
  'Equipment & Supplies',
  'Bank Charges',
  'Charity & CSR',
  'Other Expenses'
]

const categories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

export default function FinancePage() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<any[]>([])
  
  // Quick Entry Form
  const [formOpen, setFormOpen] = useState(false)
  const [formType, setFormType] = useState<'income' | 'expense'>('income')
  const [formCategory, setFormCategory] = useState(INCOME_CATEGORIES[0])
  const [formDescription, setFormDescription] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Payment Method & Bill upload states
  const [cashOrBank, setCashOrBank] = useState<'bank' | 'cash'>('bank')
  const [billUrl, setBillUrl] = useState('')
  const [billFilename, setBillFilename] = useState('')
  const [billUploading, setBillUploading] = useState(false)

  // Adjustment states
  const [adjustingEntry, setAdjustingEntry] = useState<any>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [adjustSubmitting, setAdjustSubmitting] = useState(false)

  // Filters
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchLedger()
  }, [])

  useEffect(() => {
    setFormCategory(formType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0])
  }, [formType])

  async function fetchLedger() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('finance_ledger')
        .select('*')
        .order('date', { ascending: true }) // Fetch ascending first to compute running balance chronologically

      if (error) {
        console.error("Error fetching ledger:", error.message)
        return
      }

      setEntries(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Handle Bill Upload
  const handleBillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setBillUploading(true)
    const fileName = `bills/${Date.now()}-${file.name}`
    
    const { data, error } = await supabase.storage
      .from('aisca-assets')
      .upload(fileName, file, { contentType: file.type, upsert: false })
    
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('aisca-assets').getPublicUrl(fileName)
      setBillUrl(urlData.publicUrl)
      setBillFilename(file.name)
    } else if (error) {
      alert(`Upload failed: ${error.message}`)
    }
    setBillUploading(false)
  }

  // Handle Form Submit
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formAmount || isNaN(Number(formAmount))) {
      alert("Please enter a valid amount")
      return
    }

    try {
      setFormSubmitting(true)
      const newEntry = {
        type: formType,
        category: formCategory,
        description: formDescription,
        amount: Number(formAmount),
        date: formDate,
        cash_or_bank: cashOrBank,
        bill_url: billUrl || null,
        bill_filename: billFilename || null
      }

      const { data, error } = await supabase
        .from('finance_ledger')
        .insert([newEntry])
        .select()
        .single()

      if (error) {
        alert(`Error adding entry: ${error.message}`)
        return
      }

      // Add to entries list and trigger refetch to maintain chronological order
      setEntries(prev => [...prev, data])
      setFormOpen(false)
      
      // Reset form
      setFormDescription('')
      setFormAmount('')
      setBillUrl('')
      setBillFilename('')
      setCashOrBank('bank')
    } catch (err) {
      console.error(err)
    } finally {
      setFormSubmitting(false)
    }
  }

  // Handle Adjustment Save
  const handleAdjustSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustingEntry || !adjustAmount || isNaN(Number(adjustAmount))) {
      alert("Please enter a valid amount")
      return
    }

    try {
      setAdjustSubmitting(true)
      
      // 1. Mark original entry as adjusted: true, adjustment_note: adjustNote
      const { error: updateError } = await supabase
        .from('finance_ledger')
        .update({ 
          adjusted: true, 
          adjustment_note: adjustNote 
        })
        .eq('id', adjustingEntry.id)

      if (updateError) {
        alert(`Error updating original entry: ${updateError.message}`)
        return
      }

      // 2. Create new entry
      const newEntry = {
        type: adjustingEntry.type,
        category: adjustingEntry.category,
        description: `Adjustment: ${adjustNote}`,
        amount: Number(adjustAmount),
        date: new Date().toISOString().split('T')[0],
        cash_or_bank: adjustingEntry.cash_or_bank || 'bank',
        bill_url: adjustingEntry.bill_url || null,
        bill_filename: adjustingEntry.bill_filename || null
      }

      const { data: insertedData, error: insertError } = await supabase
        .from('finance_ledger')
        .insert([newEntry])
        .select()
        .single()

      if (insertError) {
        alert(`Error creating adjustment entry: ${insertError.message}`)
        return
      }

      // Update state
      setEntries(prev => prev.map(item => item.id === adjustingEntry.id ? { ...item, adjusted: true, adjustment_note: adjustNote } : item).concat(insertedData))
      setAdjustingEntry(null)
      setAdjustAmount('')
      setAdjustNote('')
    } catch (err) {
      console.error(err)
    } finally {
      setAdjustSubmitting(false)
    }
  }

  // 1. Calculate running balances chronologically (omitting adjusted entries)
  let cumulativeBalance = 0
  const computedEntries = entries.map(item => {
    if (!item.adjusted) {
      if (item.type === 'income') {
        cumulativeBalance += Number(item.amount)
      } else {
        cumulativeBalance -= Number(item.amount)
      }
    }
    return { ...item, runningBalance: cumulativeBalance }
  })

  // 2. Filter computed entries
  const filteredEntries = computedEntries.filter(item => {
    const matchesType = typeFilter === 'all' || item.type === typeFilter
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    
    const matchesStart = !startDate || new Date(item.date) >= new Date(startDate)
    const matchesEnd = !endDate || new Date(item.date) <= new Date(endDate)

    return matchesType && matchesCategory && matchesStart && matchesEnd
  })

  // 3. Display newest transactions first
  const displayItems = [...filteredEntries].reverse()

  // Calculate aggregates (excluding adjusted entries)
  const totalIncome = filteredEntries
    .filter(e => e.type === 'income' && !e.adjusted)
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const totalExpenses = filteredEntries
    .filter(e => e.type === 'expense' && !e.adjusted)
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const netBalance = totalIncome - totalExpenses

  // Calculate totals by payment method
  const bankIncome = entries.filter(e => e.type === 'income' && (e.cash_or_bank === 'bank' || !e.cash_or_bank) && !e.adjusted).reduce((s, e) => s + Number(e.amount), 0)
  const bankExpense = entries.filter(e => e.type === 'expense' && (e.cash_or_bank === 'bank' || !e.cash_or_bank) && !e.adjusted).reduce((s, e) => s + Number(e.amount), 0)
  const cashIncome = entries.filter(e => e.type === 'income' && e.cash_or_bank === 'cash' && !e.adjusted).reduce((s, e) => s + Number(e.amount), 0)
  const cashExpense = entries.filter(e => e.type === 'expense' && e.cash_or_bank === 'cash' && !e.adjusted).reduce((s, e) => s + Number(e.amount), 0)
  
  const bankBalance = bankIncome - bankExpense
  const cashBalance = cashIncome - cashExpense

  // Recharts Chart Math: Group chronologically by Month/Year
  const monthlyMap: Record<string, { income: number; expense: number }> = {}
  computedEntries.forEach(item => {
    const [year, month] = item.date.split('-')
    const monthKey = `${year}-${month}`
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { income: 0, expense: 0 }
    }
    if (item.type === 'income') {
      monthlyMap[monthKey].income += Number(item.amount)
    } else {
      monthlyMap[monthKey].expense += Number(item.amount)
    }
  })

  const chartData = Object.keys(monthlyMap)
    .sort()
    .map(key => {
      const [year, month] = key.split('-')
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const label = `${monthNames[parseInt(month, 10) - 1]} '${year.slice(2)}`
      return {
        month: label,
        "Income": monthlyMap[key].income,
        "Expenses": monthlyMap[key].expense
      }
    })

  // CSV Export
  const handleExportCSV = () => {
    if (filteredEntries.length === 0) return

    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount (LKR)', 'Running Balance (LKR)']
    const csvRows = [
      headers.join(','),
      ...filteredEntries.map(item => [
        item.date,
        item.type.toUpperCase(),
        `"${item.category}"`,
        `"${item.description || ''}"`,
        item.amount,
        item.runningBalance
      ].join(','))
    ]

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `aisca_finance_ledger_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-t-2 border-r-2 border-[#d4af37] rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wider uppercase text-white">Finance Ledger</h1>
          <p className="text-xs text-gray-500 tracking-wide uppercase mt-1">CFO Abstraction Layer & Bookkeeping Ledger</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#d4af37] rounded-xl text-xs font-semibold uppercase tracking-wider text-black hover:bg-[#eac44e] transition-all"
          >
            {formOpen ? <X size={14} /> : <PlusCircle size={14} />}
            <span>{formOpen ? 'Close Form' : 'New Transaction'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredEntries.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Download size={14} />
            <span>Export Ledger ({filteredEntries.length})</span>
          </button>
        </div>
      </div>

      {/* Quick Entry Form Drawer */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div
            onClick={() => setFormOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          />
          <div className="relative w-full max-w-md h-full bg-[#0b0b0b] border-l border-white/5 p-8 flex flex-col overflow-y-auto z-10 shadow-2xl animate-slide-in-right">
            <div className="flex items-center justify-between pb-6 border-b border-white/5 mb-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Record Ledger Entry</h3>
              <button
                onClick={() => setFormOpen(false)}
                className="text-gray-500 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddTransaction} className="space-y-5 flex-1 finance-form-grid">
              {/* Type */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Type</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value as 'income' | 'expense')}
                  className="w-full px-3 py-2.5 bg-[#121212] border border-white/5 rounded-xl text-xs text-white focus:outline-none cursor-pointer focus:border-[#d4af37]/50"
                >
                  <option value="income">Income (+)</option>
                  <option value="expense">Expense (-)</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Category</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#121212] border border-white/5 rounded-xl text-xs text-white focus:outline-none cursor-pointer focus:border-[#d4af37]/50"
                >
                  {(formType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Cash or Bank selector */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Payment Method</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {['bank', 'cash'].map(method => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setCashOrBank(method as 'bank' | 'cash')}
                      style={{
                        padding: '8px 20px',
                        border: cashOrBank === method ? '1px solid #fff' : '1px solid rgba(255,255,255,0.15)',
                        background: cashOrBank === method ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: cashOrBank === method ? '#fff' : 'rgba(255,255,255,0.4)',
                        borderRadius: '8px', cursor: 'pointer', textTransform: 'capitalize', fontSize: '13px'
                      }}
                    >{method}</button>
                  ))}
                </div>
              </div>

              {/* Bill attachment upload */}
              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>
                  ATTACH BILL (OPTIONAL)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleBillUpload}
                  style={{ color: '#fff', fontSize: '13px', display: 'block' }}
                />
                {billUploading && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>Uploading...</p>}
                {billUrl && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>Bill attached ({billFilename})</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
                <input
                  type="text"
                  placeholder="e.g. sponsorship payout"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-[#121212] border border-white/5 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#d4af37]/50"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Amount (LKR)</label>
                <input
                  type="text"
                  placeholder="e.g. 50000"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-[#121212] border border-white/5 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#d4af37]/50"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Transaction Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-[#121212] border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-[#d4af37]/50"
                />
              </div>

              {/* Button */}
              <div className="pt-4 mt-auto border-t border-white/5">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full px-6 py-3 bg-[#d4af37] text-black font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-[#eac44e] transition-all disabled:opacity-50"
                >
                  {formSubmitting ? 'Posting...' : 'Post Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 finance-stats-grid">
        {/* Income Card */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-xl">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-green-400">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">Filtered Income</span>
            <h3 className="text-xl font-bold text-white mt-1">LKR {totalIncome.toLocaleString()}</h3>
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-xl">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-red-400">
            <TrendingDown size={20} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">Filtered Expenses</span>
            <h3 className="text-xl font-bold text-white mt-1">LKR {totalExpenses.toLocaleString()}</h3>
          </div>
        </div>

        {/* Net balance Card */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-xl">
          <div className={`w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center ${netBalance >= 0 ? 'text-[#d4af37]' : 'text-red-500'}`}>
            <CircleDollarSign size={20} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">Net Balance</span>
            <h3 className={`text-xl font-bold mt-1 ${netBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
              LKR {netBalance.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Bank Balance Card */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-xl">
          <div className={`w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center ${bankBalance >= 0 ? 'text-blue-400' : 'text-red-500'}`}>
            <CircleDollarSign size={20} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">Bank Balance</span>
            <h3 className={`text-xl font-bold mt-1 ${bankBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
              LKR {bankBalance.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Cash Balance Card */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-xl">
          <div className={`w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center ${cashBalance >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
            <CircleDollarSign size={20} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">Cash Balance</span>
            <h3 className={`text-xl font-bold mt-1 ${cashBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
              LKR {cashBalance.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* Charts & Filter Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 finance-main-grid">
        {/* Advanced Filters */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl shadow-xl flex flex-col justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Ledger Filters</h4>
            <div className="space-y-4">
              {/* Type Filter */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Transaction Type</label>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#121212] border border-white/5 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="income">Incomes Only</option>
                  <option value="expense">Expenses Only</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Category</label>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#121212] border border-white/5 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Date Ranges */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121212] border border-white/5 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121212] border border-white/5 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { setTypeFilter('all'); setCategoryFilter('all'); setStartDate(''); setEndDate(''); }}
            className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-all text-center"
          >
            Clear Active Filters
          </button>
        </div>

        {/* Monthly Performance Chart */}
        <div className="lg:col-span-2 bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl shadow-xl">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Bookkeeping Timeline</h4>
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Monthly Cash Flow Comparison</span>
          </div>
          <div className="h-[230px] w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-500 uppercase tracking-wider">
                Insufficient data to render chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10, textTransform: 'uppercase' }} />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Running Ledger Grid Table */}
      <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01]">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar size={14} className="text-[#d4af37]" />
            <span>Audit Ledger</span>
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-white">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.005] text-gray-500 uppercase tracking-widest text-[9px]">
                <th className="p-4 font-semibold">Transaction Date</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Method</th>
                <th className="p-4 font-semibold">Description</th>
                <th className="p-4 font-semibold">Bill</th>
                <th className="p-4 font-semibold text-right">Amount</th>
                <th className="p-4 font-semibold text-right">Running Balance</th>
                <th className="p-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500 uppercase tracking-widest text-[10px]">
                    No bookkeeping entries found matching filter conditions.
                  </td>
                </tr>
              ) : (
                displayItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.01] transition-all" style={item.adjusted ? { opacity: 0.4, textDecoration: 'line-through' } : {}}>
                    {/* Date */}
                    <td className="p-4 font-semibold text-gray-300">
                      {new Date(item.date).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' })}
                    </td>

                    {/* Type Badge */}
                    <td className="p-4">
                      {item.type === 'income' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-bold uppercase">
                          <PlusCircle size={10} />
                          <span>Income</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-bold uppercase">
                          <MinusCircle size={10} />
                          <span>Expense</span>
                        </span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="p-4 font-semibold text-white">
                      {item.category}
                    </td>

                    {/* Payment Method */}
                    <td className="p-4 font-semibold text-gray-300 uppercase font-mono text-[10px]">
                      {item.cash_or_bank || 'bank'}
                    </td>

                    {/* Description */}
                    <td className="p-4 text-gray-400 font-normal">
                      {item.description}
                      {item.adjusted && item.adjustment_note && (
                        <div className="text-[10px] text-amber-500/80 mt-0.5">Note: {item.adjustment_note}</div>
                      )}
                    </td>

                    {/* Bill URL */}
                    <td className="p-4">
                      {item.bill_url ? (
                        <a 
                          href={item.bill_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#d4af37] hover:underline"
                        >
                          View Bill
                        </a>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className={`p-4 text-right font-mono font-bold ${item.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                      {item.type === 'income' ? '+' : '-'} LKR {Number(item.amount).toLocaleString()}
                    </td>

                    {/* Running Balance */}
                    <td className="p-4 text-right font-mono font-bold text-gray-300">
                      LKR {Number(item.runningBalance).toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      {!item.adjusted ? (
                        <button
                          onClick={() => {
                            setAdjustingEntry(item)
                            setAdjustAmount(item.amount.toString())
                            setAdjustNote('')
                          }}
                          className="px-2 py-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          Adjust
                        </button>
                      ) : (
                        <span className="text-gray-500 text-[10px] font-bold uppercase">Adjusted</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustment Modal Overlay */}
      {adjustingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            onClick={() => setAdjustingEntry(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />
          <div className="relative w-full max-w-md bg-[#0b0b0b] border border-white/5 rounded-2xl p-6 shadow-2xl z-10 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Adjust Ledger Entry</h3>
              <button
                onClick={() => setAdjustingEntry(null)}
                className="text-gray-500 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAdjustSave} className="space-y-4">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Original Description</p>
                <p className="text-xs text-white font-medium">{adjustingEntry.description}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Original Amount</p>
                <p className="text-xs text-white font-medium">LKR {Number(adjustingEntry.amount).toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">New Amount (LKR)</label>
                <input
                  type="text"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-[#121212] border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-[#d4af37]/50"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Adjustment Reason / Note</label>
                <textarea
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-3 py-2 bg-[#121212] border border-white/5 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#d4af37]/50"
                  placeholder="Describe the reason for correction..."
                />
              </div>
              <div className="pt-4 border-t border-white/5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustingEntry(null)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="flex-1 py-2.5 bg-[#d4af37] hover:bg-[#eac44e] text-black font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {adjustSubmitting ? 'Saving...' : 'Apply Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
