'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Scale, FileUp, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

export default function ReconciliationTab() {
  const [loading, setLoading] = useState(true)
  const [reconciliations, setReconciliations] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const { data } = await supabase.from('finance_reconciliation').select('*').order('statement_date', { ascending: false })
      setReconciliations(data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#6B6B6B', fontSize: '14px' }}>Loading reconciliation data...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111111', margin: '0 0 4px 0' }}>Bank Reconciliation</h3>
          <p style={{ fontSize: '13px', color: '#6B6B6B', margin: 0 }}>Match ledger entries against official bank statements to identify discrepancies.</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#111111', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
          <FileUp size={16} /> New Reconciliation
        </button>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '12px', overflow: 'hidden' }}>
        {reconciliations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B6B6B' }}>
            <Scale size={48} color="#E8E8E8" style={{ margin: '0 auto 16px auto' }} />
            <p style={{ fontSize: '14px', fontWeight: '500' }}>No reconciliation records found.</p>
            <p style={{ fontSize: '13px', color: '#A3A3A3', marginTop: '4px' }}>Click 'New Reconciliation' to upload a bank statement.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9F9F9', borderBottom: '1px solid #E8E8E8' }}>
                  {['Period End Date', 'Bank Balance', 'Ledger Balance', 'Difference', 'Status', 'Prepared By', 'Date'].map((th, i) => (
                    <th key={i} style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {th}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reconciliations.map(rec => {
                  const diff = Number(rec.difference_amount)
                  
                  return (
                    <tr key={rec.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#111111', fontWeight: '500' }}>
                        {new Date(rec.statement_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6B6B6B', fontFamily: 'monospace' }}>
                        LKR {Number(rec.statement_balance).toLocaleString()}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6B6B6B', fontFamily: 'monospace' }}>
                        LKR {Number(rec.ledger_balance).toLocaleString()}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: diff === 0 ? '#22C55E' : '#EF4444', fontWeight: '700', fontFamily: 'monospace' }}>
                        LKR {diff.toLocaleString()}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase',
                          background: rec.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : rec.status === 'discrepancy' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: rec.status === 'completed' ? '#22C55E' : rec.status === 'discrepancy' ? '#EF4444' : '#F59E0B'
                        }}>
                          {rec.status === 'completed' ? <CheckCircle2 size={12}/> : rec.status === 'discrepancy' ? <AlertCircle size={12}/> : <Clock size={12}/>}
                          {rec.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '13px', color: '#6B6B6B' }}>{rec.prepared_by}</td>
                      <td style={{ padding: '16px 24px', fontSize: '13px', color: '#A3A3A3' }}>
                        {new Date(rec.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
