'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Download, Printer } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export default function ReportsTab() {
  const [loading, setLoading] = useState(false)
  const [entries, setEntries] = useState<any[]>([])
  
  // Date period state
  const [periodType, setPeriodType] = useState('year') // month, quarter, year, custom
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    // Default to current year YTD
    const now = new Date()
    setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0])
    setEndDate(now.toISOString().split('T')[0])
    
    async function fetchLedger() {
      setLoading(true)
      const { data } = await supabase.from('finance_ledger').select('*').eq('adjusted', false).order('date', { ascending: true })
      setEntries(data || [])
      setLoading(false)
    }
    fetchLedger()
  }, [])

  // Auto-update dates based on periodType
  useEffect(() => {
    const now = new Date()
    if (periodType === 'month') {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0])
      setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0])
    } else if (periodType === 'quarter') {
      const q = Math.floor(now.getMonth() / 3)
      setStartDate(new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0])
      setEndDate(new Date(now.getFullYear(), q * 3 + 3, 0).toISOString().split('T')[0])
    } else if (periodType === 'year') {
      setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0])
      setEndDate(new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0])
    }
  }, [periodType])

  // Helpers for financial calculations
  const calculateFinancials = () => {
    // 1. Filter entries up to End Date for Balance Sheet
    const upToDateEntries = entries.filter(e => new Date(e.date) <= new Date(endDate))
    
    // 2. Filter entries exactly within period for Income Statement & Cash Flows
    const periodEntries = upToDateEntries.filter(e => new Date(e.date) >= new Date(startDate))

    // 3. Filter entries prior to Start Date for Opening Balances
    const priorEntries = entries.filter(e => new Date(e.date) < new Date(startDate))

    // ----- Balances -----
    const bankBalance = upToDateEntries.filter(e => e.type === 'income' && (e.cash_or_bank === 'bank' || !e.cash_or_bank)).reduce((s, e) => s + Number(e.amount), 0)
      - upToDateEntries.filter(e => e.type === 'expense' && (e.cash_or_bank === 'bank' || !e.cash_or_bank)).reduce((s, e) => s + Number(e.amount), 0)
    const cashBalance = upToDateEntries.filter(e => e.type === 'income' && e.cash_or_bank === 'cash').reduce((s, e) => s + Number(e.amount), 0)
      - upToDateEntries.filter(e => e.type === 'expense' && e.cash_or_bank === 'cash').reduce((s, e) => s + Number(e.amount), 0)
    
    const openingBank = priorEntries.filter(e => e.type === 'income' && (e.cash_or_bank === 'bank' || !e.cash_or_bank)).reduce((s, e) => s + Number(e.amount), 0)
      - priorEntries.filter(e => e.type === 'expense' && (e.cash_or_bank === 'bank' || !e.cash_or_bank)).reduce((s, e) => s + Number(e.amount), 0)
    const openingCash = priorEntries.filter(e => e.type === 'income' && e.cash_or_bank === 'cash').reduce((s, e) => s + Number(e.amount), 0)
      - priorEntries.filter(e => e.type === 'expense' && e.cash_or_bank === 'cash').reduce((s, e) => s + Number(e.amount), 0)

    // ----- Income & Expenditure -----
    const incomeByCategory: Record<string, number> = {}
    const expenseByCategory: Record<string, number> = {}
    
    periodEntries.forEach(e => {
      if (e.type === 'income') {
        incomeByCategory[e.category] = (incomeByCategory[e.category] || 0) + Number(e.amount)
      } else {
        expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + Number(e.amount)
      }
    })

    const totalIncome = Object.values(incomeByCategory).reduce((a,b) => a+b, 0)
    const totalExpense = Object.values(expenseByCategory).reduce((a,b) => a+b, 0)
    const netSurplus = totalIncome - totalExpense

    // ----- Funds (General, Event, Merchandise, Charity) -----
    const getFundBalance = (arr: any[], fund: string) => {
      const fundName = fund === 'General' ? null : `${fund} Fund` // Assuming null maps to General
      return arr.filter(e => e.type === 'income' && (fundName ? e.fund === fundName : !e.fund || e.fund === 'General Fund')).reduce((s,e) => s + Number(e.amount), 0)
        - arr.filter(e => e.type === 'expense' && (fundName ? e.fund === fundName : !e.fund || e.fund === 'General Fund')).reduce((s,e) => s + Number(e.amount), 0)
    }

    const funds = ['General', 'Event', 'Merchandise', 'Charity']
    const openingFunds = funds.map(f => getFundBalance(priorEntries, f))
    const closingFunds = funds.map(f => getFundBalance(upToDateEntries, f))
    const surplusFunds = funds.map(f => getFundBalance(periodEntries, f))

    // Note: Transfers will be 0 for now until Phase 2c
    const transfersFunds = [0, 0, 0, 0]

    // ----- Event/Project P&L -----
    const eventTags = Array.from(new Set(periodEntries.map(e => e.project_tag).filter(t => !!t)))
    const eventSummaries = eventTags.map(tag => {
      const rev = periodEntries.filter(e => e.project_tag === tag && e.type === 'income').reduce((s,e) => s + Number(e.amount), 0)
      const exp = periodEntries.filter(e => e.project_tag === tag && e.type === 'expense').reduce((s,e) => s + Number(e.amount), 0)
      return { tag, rev, exp, net: rev - exp }
    })

    return {
      upToDateEntries, periodEntries, 
      bankBalance, cashBalance, 
      openingBank, openingCash,
      incomeByCategory, expenseByCategory, totalIncome, totalExpense, netSurplus,
      funds, openingFunds, closingFunds, surplusFunds, transfersFunds,
      eventSummaries
    }
  }

  const handleExportPDF = () => {
    const doc = new (jsPDF as any)()
    const {
      bankBalance, cashBalance,
      openingBank, openingCash,
      incomeByCategory, expenseByCategory, totalIncome, totalExpense, netSurplus,
      funds, openingFunds, closingFunds, surplusFunds, transfersFunds,
      eventSummaries
    } = calculateFinancials()

    const addHeader = (title: string, subtitle: string) => {
      doc.setFontSize(22)
      doc.setTextColor(17, 17, 17)
      doc.text("AISCA", 14, 22)
      doc.setFontSize(14)
      doc.text(title, 14, 32)
      doc.setFontSize(10)
      doc.setTextColor(107, 107, 107)
      doc.text(subtitle, 14, 40)
    }

    // --- Statement 1: Statement of Financial Position ---
    addHeader("Statement of Financial Position", `As at ${endDate}`)
    autoTable(doc, {
      startY: 50,
      head: [["Assets", "Amount (LKR)"]],
      body: [
        ["Cash at Bank", bankBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })],
        ["Cash in Hand", cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })],
        [{ content: "Total Assets", styles: { fontStyle: 'bold' as any } }, { content: (bankBalance + cashBalance).toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' as any } }],
        ["", ""],
        ["Liabilities", "0.00"],
        [{ content: "Net Assets", styles: { fontStyle: 'bold' as any } }, { content: (bankBalance + cashBalance).toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' as any } }]
      ],
      theme: 'grid', headStyles: { fillColor: [17, 17, 17] },
    })

    // --- Statement 2: Statement of Financial Activities ---
    doc.addPage()
    addHeader("Statement of Financial Activities", `For the period ${startDate} to ${endDate}`)
    
    const incomeBody = Object.entries(incomeByCategory).map(([cat, amt]) => [cat, amt.toLocaleString(undefined, { minimumFractionDigits: 2 })])
    const expenseBody = Object.entries(expenseByCategory).map(([cat, amt]) => [cat, `(${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })})`])
    
    autoTable(doc, {
      startY: 50,
      head: [["Income", "Amount (LKR)"]],
      body: [
        ...incomeBody,
        [{ content: "Total Income", styles: { fontStyle: 'bold' as any } }, { content: totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' as any } }]
      ],
      theme: 'grid', headStyles: { fillColor: [17, 17, 17] },
    })

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Expenditure", "Amount (LKR)"]],
      body: [
        ...expenseBody,
        [{ content: "Total Expenditure", styles: { fontStyle: 'bold' as any } }, { content: `(${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })})`, styles: { fontStyle: 'bold' as any } }],
        ["", ""],
        [{ content: "Surplus / (Deficit) for the period", styles: { fontStyle: 'bold' as any } }, { content: netSurplus.toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' as any } }]
      ],
      theme: 'grid', headStyles: { fillColor: [17, 17, 17] },
    })

    // --- Statement 3: Statement of Cash Flows ---
    doc.addPage()
    addHeader("Statement of Cash Flows", `For the period ${startDate} to ${endDate}`)
    autoTable(doc, {
      startY: 50,
      head: [["Cash Flows from Operating Activities", "Amount (LKR)"]],
      body: [
        ["Cash received from members/sponsors/donors", totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })],
        ["Cash paid for events and operations", `(${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })})`],
        [{ content: "Net Cash from Operating Activities", styles: { fontStyle: 'bold' as any } }, { content: netSurplus.toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' as any } }],
        ["", ""],
        ["Cash Flows from Investing/Financing", "0.00"],
        ["", ""],
        [{ content: "Net Increase / (Decrease) in Cash", styles: { fontStyle: 'bold' as any } }, { content: netSurplus.toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' as any } }],
        ["Cash at Beginning of Period", (openingBank + openingCash).toLocaleString(undefined, { minimumFractionDigits: 2 })],
        [{ content: "Cash at End of Period", styles: { fontStyle: 'bold' as any } }, { content: (bankBalance + cashBalance).toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' as any } }]
      ],
      theme: 'grid', headStyles: { fillColor: [17, 17, 17] },
    })

    // --- Statement 4: Statement of Changes in Fund Balances ---
    doc.addPage()
    addHeader("Statement of Changes in Fund Balances", `For the period ${startDate} to ${endDate}`)
    autoTable(doc, {
      startY: 50,
      head: [["Description", ...funds, "Total"]],
      body: [
        ["Opening Balance", ...openingFunds.map(v => v.toLocaleString()), openingFunds.reduce((a,b)=>a+b,0).toLocaleString()],
        ["Surplus / (Deficit)", ...surplusFunds.map(v => v.toLocaleString()), surplusFunds.reduce((a,b)=>a+b,0).toLocaleString()],
        ["Transfers In / (Out)", ...transfersFunds.map(v => v.toLocaleString()), transfersFunds.reduce((a,b)=>a+b,0).toLocaleString()],
        [{ content: "Closing Balance", styles: { fontStyle: 'bold' as any } }, ...closingFunds.map(v => ({ content: v.toLocaleString(), styles: { fontStyle: 'bold' as any } })), { content: closingFunds.reduce((a,b)=>a+b,0).toLocaleString(), styles: { fontStyle: 'bold' as any } }]
      ],
      theme: 'grid', headStyles: { fillColor: [17, 17, 17] },
    })

    // --- Statement 5: Notes to the Financial Statements ---
    doc.addPage()
    addHeader("Notes to the Financial Statements", `For the period ${startDate} to ${endDate}`)
    doc.setFontSize(12)
    doc.setTextColor(17, 17, 17)
    
    doc.text("Note 1: Basis of Preparation", 14, 50)
    doc.setFontSize(10)
    doc.setTextColor(107, 107, 107)
    doc.text("These financial statements have been prepared on a cash basis of accounting, whereby income", 14, 58)
    doc.text("and expenditure are recognized when cash is received or paid.", 14, 64)

    doc.setFontSize(12)
    doc.setTextColor(17, 17, 17)
    doc.text("Note 2: Fund Accounting Policy", 14, 80)
    doc.setFontSize(10)
    doc.setTextColor(107, 107, 107)
    doc.text("The organization maintains General, Event, Merchandise, and Charity funds to track designated cash.", 14, 88)

    doc.setFontSize(12)
    doc.setTextColor(17, 17, 17)
    doc.text("Note 3: Event / Project Summary", 14, 104)

    if (eventSummaries.length > 0) {
      autoTable(doc, {
        startY: 110,
        head: [["Project Tag", "Revenue", "Expense", "Net Margin"]],
        body: eventSummaries.map(es => [
          es.tag, 
          es.rev.toLocaleString(), 
          es.exp.toLocaleString(), 
          es.net.toLocaleString()
        ]),
        theme: 'grid', headStyles: { fillColor: [17, 17, 17] },
      })
    } else {
      doc.setFontSize(10)
      doc.text("No events or projects recorded in this period.", 14, 112)
    }

    // Signatures
    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 120
    doc.setDrawColor(0)
    doc.setLineWidth(0.5)
    
    const sigY = finalY + 40
    doc.line(20, sigY, 60, sigY)
    doc.text("Chairman", 30, sigY + 6)
    
    doc.line(80, sigY, 120, sigY)
    doc.text("CFO", 95, sigY + 6)
    
    doc.line(140, sigY, 190, sigY)
    doc.text("Finance Manager", 150, sigY + 6)

    doc.save(`AISCA_Financial_Statements_${endDate}.pdf`)
  }

  const handleExportExcel = () => {
    const {
      bankBalance, cashBalance,
      openingBank, openingCash,
      incomeByCategory, expenseByCategory, totalIncome, totalExpense, netSurplus,
      funds, openingFunds, closingFunds, surplusFunds, transfersFunds,
      eventSummaries, periodEntries
    } = calculateFinancials()

    const wb = XLSX.utils.book_new()

    // 1. Financial Position
    const ws1 = XLSX.utils.aoa_to_sheet([
      ["AISCA - Statement of Financial Position"],
      [`As at ${endDate}`],
      [],
      ["Assets", "Amount (LKR)"],
      ["Cash at Bank", bankBalance],
      ["Cash in Hand", cashBalance],
      ["Total Assets", bankBalance + cashBalance],
      [],
      ["Liabilities", 0],
      ["Net Assets", bankBalance + cashBalance]
    ])
    XLSX.utils.book_append_sheet(wb, ws1, "Financial Position")

    // 2. Financial Activities
    const ws2 = XLSX.utils.aoa_to_sheet([
      ["AISCA - Statement of Financial Activities"],
      [`For the period ${startDate} to ${endDate}`],
      [],
      ["Income", "Amount (LKR)"],
      ...Object.entries(incomeByCategory),
      ["Total Income", totalIncome],
      [],
      ["Expenditure", "Amount (LKR)"],
      ...Object.entries(expenseByCategory),
      ["Total Expenditure", totalExpense],
      [],
      ["Surplus / (Deficit)", netSurplus]
    ])
    XLSX.utils.book_append_sheet(wb, ws2, "Financial Activities")

    // 3. Cash Flows
    const ws3 = XLSX.utils.aoa_to_sheet([
      ["AISCA - Statement of Cash Flows"],
      [`For the period ${startDate} to ${endDate}`],
      [],
      ["Operating Activities", "Amount (LKR)"],
      ["Cash received", totalIncome],
      ["Cash paid", -totalExpense],
      ["Net Cash from Operating", netSurplus],
      [],
      ["Investing / Financing", 0],
      [],
      ["Net Increase / (Decrease)", netSurplus],
      ["Opening Cash", openingBank + openingCash],
      ["Closing Cash", bankBalance + cashBalance]
    ])
    XLSX.utils.book_append_sheet(wb, ws3, "Cash Flows")

    // 4. Fund Balances
    const ws4 = XLSX.utils.aoa_to_sheet([
      ["AISCA - Statement of Changes in Fund Balances"],
      [`For the period ${startDate} to ${endDate}`],
      [],
      ["Description", ...funds, "Total"],
      ["Opening Balance", ...openingFunds, openingFunds.reduce((a,b)=>a+b,0)],
      ["Surplus / (Deficit)", ...surplusFunds, surplusFunds.reduce((a,b)=>a+b,0)],
      ["Transfers In / (Out)", ...transfersFunds, transfersFunds.reduce((a,b)=>a+b,0)],
      ["Closing Balance", ...closingFunds, closingFunds.reduce((a,b)=>a+b,0)]
    ])
    XLSX.utils.book_append_sheet(wb, ws4, "Fund Balances")

    // 5. Notes
    const ws5 = XLSX.utils.aoa_to_sheet([
      ["AISCA - Notes to Financial Statements"],
      [],
      ["Note 1: Basis of Preparation", "Cash basis"],
      ["Note 2: Fund Accounting", "General, Event, Merchandise, Charity funds maintained."],
      [],
      ["Note 3: Event/Project Summary"],
      ["Project Tag", "Revenue", "Expense", "Net Margin"],
      ...eventSummaries.map(e => [e.tag, e.rev, e.exp, e.net])
    ])
    XLSX.utils.book_append_sheet(wb, ws5, "Notes")

    // 6. Raw Transactions
    const ws6 = XLSX.utils.json_to_sheet(periodEntries.map(e => ({
      Date: e.date,
      Type: e.type,
      Category: e.category,
      Fund: e.fund,
      Project: e.project_tag,
      Amount: e.amount,
      Bank_or_Cash: e.cash_or_bank,
      Description: e.description
    })))
    XLSX.utils.book_append_sheet(wb, ws6, "Raw Transactions")

    XLSX.writeFile(wb, `AISCA_Financials_${endDate}.xlsx`)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {/* Date Range Selector */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '12px', padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase', marginBottom: '8px' }}>Reporting Period</label>
          <select value={periodType} onChange={e => setPeriodType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }}>
            <option value="month">Current Month</option>
            <option value="quarter">Current Quarter</option>
            <option value="year">Current Year (YTD)</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>
        
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase', marginBottom: '8px' }}>Start Date</label>
          <input type="date" value={startDate} disabled={periodType !== 'custom'} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none', background: periodType !== 'custom' ? '#F5F5F5' : '#FFF' }} />
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase', marginBottom: '8px' }}>End Date</label>
          <input type="date" value={endDate} disabled={periodType !== 'custom'} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none', background: periodType !== 'custom' ? '#F5F5F5' : '#FFF' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Financial Statements Card (PDF) */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '12px', padding: '32px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <FileText size={24} color="#111111" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111111', margin: '0 0 8px 0' }}>Official SLFRS Statements</h3>
          <p style={{ fontSize: '14px', color: '#6B6B6B', margin: '0 0 24px 0', lineHeight: '1.5' }}>
            Generate the complete 5-part financial statements (Position, Activities, Cash Flows, Fund Balances, Notes) as a formatted PDF.
          </p>
          <button 
            onClick={handleExportPDF}
            disabled={loading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: 'none', background: '#111111', color: '#FFFFFF', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Printer size={16} /> Generate Official PDF
          </button>
        </div>

        {/* Transaction Export Card (Excel) */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '12px', padding: '32px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Download size={24} color="#111111" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111111', margin: '0 0 8px 0' }}>Excel Financial Model</h3>
          <p style={{ fontSize: '14px', color: '#6B6B6B', margin: '0 0 24px 0', lineHeight: '1.5' }}>
            Export a full workbook containing all 5 statements separated into individual sheets, plus a raw transactions ledger dump.
          </p>
          <button 
            onClick={handleExportExcel}
            disabled={loading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: '1px solid #E8E8E8', background: '#FFFFFF', color: '#111111', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Download size={16} /> Download Excel Workbook
          </button>
        </div>
      </div>
    </div>
  )
}
