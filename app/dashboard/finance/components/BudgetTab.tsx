'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PiggyBank, Plus } from 'lucide-react'

export default function BudgetTab() {
  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState<any[]>([])
  const [expenses, setExpenses] = useState<Record<string, number>>({})

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const currentYear = new Date().getFullYear()

      // 1. Fetch budgets for current year
      const { data: bData } = await supabase.from('finance_budgets').select('*').eq('period', currentYear.toString())
      setBudgets(bData || [])

      // 2. Fetch expenses to calculate usage
      const { data: eData } = await supabase.from('finance_ledger').select('category, amount').eq('type', 'expense').eq('adjusted', false).gte('date', `${currentYear}-01-01`).lte('date', `${currentYear}-12-31`)
      
      const expMap: Record<string, number> = {}
      eData?.forEach(e => {
        expMap[e.category] = (expMap[e.category] || 0) + Number(e.amount)
      })
      setExpenses(expMap)

      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#6B6B6B', fontSize: '14px' }}>Loading budget data...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111111', margin: '0 0 4px 0' }}>Annual Budget Tracking ({new Date().getFullYear()})</h3>
          <p style={{ fontSize: '13px', color: '#6B6B6B', margin: 0 }}>Monitor expense categories against allocated budgets.</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#111111', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
          <Plus size={16} /> Set Budget Limit
        </button>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '12px', padding: '24px' }}>
        {budgets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B6B6B' }}>
            <PiggyBank size={48} color="#E8E8E8" style={{ margin: '0 auto 16px auto' }} />
            <p style={{ fontSize: '14px', fontWeight: '500' }}>No budget limits configured for {new Date().getFullYear()}.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {budgets.map(b => {
              const spent = expenses[b.category] || 0
              const limit = Number(b.amount_limit)
              const percent = Math.min(100, Math.max(0, (spent / limit) * 100))
              const isOver = spent > limit
              
              return (
                <div key={b.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111111', margin: '0 0 4px 0' }}>{b.category}</h4>
                      <p style={{ fontSize: '12px', color: '#6B6B6B', margin: 0 }}>LKR {spent.toLocaleString()} spent of LKR {limit.toLocaleString()}</p>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: isOver ? '#EF4444' : '#111111' }}>
                      {percent.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#F5F5F5', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: isOver ? '#EF4444' : '#111111', borderRadius: '4px' }} />
                  </div>
                  {isOver && <p style={{ fontSize: '11px', color: '#EF4444', margin: '8px 0 0 0', fontWeight: '500' }}>Budget limit exceeded by LKR {(spent - limit).toLocaleString()}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
