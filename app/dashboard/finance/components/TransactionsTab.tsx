'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Plus, Filter, Download, ArrowRight, Flag } from 'lucide-react'

export default function TransactionsTab() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    fetchLedger()
  }, [])

  async function fetchLedger() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('finance_ledger')
        .select(`
          *,
          finance_ledger_details (
            bank_reference_number,
            invoice_number
          )
        `)
        .order('date', { ascending: false })
      
      if (!error && data) {
        setEntries(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredEntries = entries.filter(e => {
    const matchesSearch = 
      e.description?.toLowerCase().includes(search.toLowerCase()) || 
      e.category?.toLowerCase().includes(search.toLowerCase()) ||
      e.finance_ledger_details?.bank_reference_number?.toLowerCase().includes(search.toLowerCase())

    const matchesType = filterType === 'all' || e.type === filterType
    return matchesSearch && matchesType
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Search & Filters */}
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={16} color="#A3A3A3" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search descriptions, bank ref..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '13px', outline: 'none' }}
            />
          </div>
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '13px', outline: 'none', background: '#FFFFFF', cursor: 'pointer' }}
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: '1px solid #E8E8E8', background: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Download size={16} /> Export
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#111111', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Plus size={16} /> Record Transaction
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
           <div style={{ padding: '40px', textAlign: 'center', color: '#6B6B6B', fontSize: '14px' }}>Loading transactions...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9F9F9', borderBottom: '1px solid #E8E8E8' }}>
                  {['Date', 'Type', 'Category', 'Description', 'Bank Ref #', 'Amount', ''].map((th, i) => (
                    <th key={i} style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {th}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#6B6B6B', fontSize: '14px' }}>No transactions found.</td>
                  </tr>
                ) : (
                  filteredEntries.map(entry => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid #F0F0F0', opacity: entry.adjusted ? 0.6 : 1, textDecoration: entry.adjusted ? 'line-through' : 'none' }}>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#111111', fontWeight: '500', whiteSpace: 'nowrap' }}>
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase',
                          background: entry.type === 'income' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: entry.type === 'income' ? '#22C55E' : '#EF4444'
                        }}>
                          {entry.type}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6B6B6B' }}>
                        {entry.category}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#111111' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {entry.description}
                          {entry.adjusted && <span title={`Adjustment Note: ${entry.adjustment_note}`}><Flag size={14} color="#F59E0B" /></span>}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '13px', color: '#6B6B6B', fontFamily: 'monospace' }}>
                        {entry.finance_ledger_details?.bank_reference_number || '-'}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: entry.type === 'income' ? '#22C55E' : '#EF4444', fontWeight: '700', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {entry.type === 'income' ? '+' : '-'} LKR {Number(entry.amount).toLocaleString()}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#A3A3A3' }}>
                          <ArrowRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
