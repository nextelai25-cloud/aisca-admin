'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Download, Printer } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function ReportsTab() {
  const [loading, setLoading] = useState(false)
  const [entries, setEntries] = useState<any[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    async function fetchLedger() {
      setLoading(true)
      const { data } = await supabase.from('finance_ledger').select('*').eq('adjusted', false)
      setEntries(data || [])
      setLoading(false)
    }
    fetchLedger()
  }, [])

  const handleExportCSV = () => {
    let filtered = entries
    if (startDate) filtered = filtered.filter(e => new Date(e.date) >= new Date(startDate))
    if (endDate) filtered = filtered.filter(e => new Date(e.date) <= new Date(endDate))

    if (filtered.length === 0) {
      alert('No data for selected period.')
      return
    }

    const headers = ['Date', 'Type', 'Category', 'Fund', 'Description', 'Amount']
    const csvRows = [
      headers.join(','),
      ...filtered.map(item => [
        item.date,
        item.type.toUpperCase(),
        `"${item.category}"`,
        `"${item.fund || ''}"`,
        `"${item.description || ''}"`,
        item.amount
      ].join(','))
    ]

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `AISCA_Ledger_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportPDF = () => {
    const doc = new (jsPDF as any)()
    
    doc.setFontSize(20)
    doc.text("AISCA Financial Statements", 14, 22)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)

    // Statement of Financial Position
    doc.setFontSize(14)
    doc.setTextColor(0)
    doc.text("Statement of Financial Position", 14, 45)
    
    const bankIncome = entries.filter(e => e.type === 'income' && (e.cash_or_bank === 'bank' || !e.cash_or_bank)).reduce((s, e) => s + Number(e.amount), 0)
    const bankExpense = entries.filter(e => e.type === 'expense' && (e.cash_or_bank === 'bank' || !e.cash_or_bank)).reduce((s, e) => s + Number(e.amount), 0)
    const cashIncome = entries.filter(e => e.type === 'income' && e.cash_or_bank === 'cash').reduce((s, e) => s + Number(e.amount), 0)
    const cashExpense = entries.filter(e => e.type === 'expense' && e.cash_or_bank === 'cash').reduce((s, e) => s + Number(e.amount), 0)
    
    const bankBalance = bankIncome - bankExpense
    const cashBalance = cashIncome - cashExpense
    const overallNetAssets = bankBalance + cashBalance

    const sfpData = [
      ["Assets", ""],
      ["Cash at Bank", `LKR ${bankBalance.toLocaleString()}`],
      ["Cash in Hand", `LKR ${cashBalance.toLocaleString()}`],
      ["Total Assets", `LKR ${overallNetAssets.toLocaleString()}`],
      ["", ""],
      ["Liabilities", "LKR 0"],
      ["Net Assets", `LKR ${overallNetAssets.toLocaleString()}`]
    ]

    autoTable(doc, {
      startY: 50,
      head: [["Category", "Amount"]],
      body: sfpData,
      theme: 'grid',
      headStyles: { fillColor: [17, 17, 17] },
    })

    // Income Statement
    const soaY = (doc as any).lastAutoTable.finalY + 15
    doc.text("Income Statement", 14, soaY)

    const totalIncome = entries.filter(e => e.type === 'income').reduce((s,e) => s + Number(e.amount), 0)
    const totalExpenses = entries.filter(e => e.type === 'expense').reduce((s,e) => s + Number(e.amount), 0)

    const soaData = [
      ["Total Revenue", `LKR ${totalIncome.toLocaleString()}`],
      ["Total Expenses", `LKR ${totalExpenses.toLocaleString()}`],
      ["", ""],
      ["Net Surplus / (Deficit)", `LKR ${overallNetAssets.toLocaleString()}`]
    ]

    autoTable(doc, {
      startY: soaY + 5,
      head: [["Account / Category", "Amount"]],
      body: soaData,
      theme: 'grid',
      headStyles: { fillColor: [17, 17, 17] },
    })

    doc.save(`AISCA_Financial_Statements_${Date.now()}.pdf`)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
      
      {/* Financial Statements Card */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '12px', padding: '32px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <FileText size={24} color="#111111" />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111111', margin: '0 0 8px 0' }}>Financial Statements</h3>
        <p style={{ fontSize: '14px', color: '#6B6B6B', margin: '0 0 24px 0', lineHeight: '1.5' }}>
          Generate the official Income Statement and Statement of Financial Position (Balance Sheet) reflecting all reconciled ledger entries.
        </p>
        <button 
          onClick={handleExportPDF}
          disabled={loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: 'none', background: '#111111', color: '#FFFFFF', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <Printer size={16} /> Generate PDF Report
        </button>
      </div>

      {/* Transaction Export Card */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '12px', padding: '32px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <Download size={24} color="#111111" />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111111', margin: '0 0 8px 0' }}>Raw Transaction Export</h3>
        <p style={{ fontSize: '14px', color: '#6B6B6B', margin: '0 0 24px 0', lineHeight: '1.5' }}>
          Export ledger entries to CSV for deep analysis in Excel or other accounting software. Filter by specific date ranges.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase', marginBottom: '6px' }}>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '13px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase', marginBottom: '6px' }}>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '13px' }} />
          </div>
        </div>

        <button 
          onClick={handleExportCSV}
          disabled={loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: '1px solid #E8E8E8', background: '#FFFFFF', color: '#111111', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <Download size={16} /> Download CSV
        </button>
      </div>

    </div>
  )
}
