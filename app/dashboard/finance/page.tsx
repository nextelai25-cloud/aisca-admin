'use client'

import React, { useState } from 'react'
import { LayoutDashboard, Receipt, FileText, PiggyBank, Scale } from 'lucide-react'
import DashboardTab from './components/DashboardTab'
import TransactionsTab from './components/TransactionsTab'
import ReportsTab from './components/ReportsTab'
import BudgetTab from './components/BudgetTab'
import ReconciliationTab from './components/ReconciliationTab'

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'reports' | 'budget' | 'reconciliation'>('dashboard')

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'budget', label: 'Budget', icon: PiggyBank },
    { id: 'reconciliation', label: 'Reconciliation', icon: Scale },
  ] as const

  return (
    <div className="space-y-6 animate-fade-in" style={{ padding: '0 24px' }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-wider uppercase text-[#111111]">Finance Command Center</h1>
        <p className="text-xs text-[#6B6B6B] tracking-wide uppercase mt-1">Comprehensive Financial Management & Reporting</p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 pb-4 border-b border-[#E8E8E8]">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px',
                fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s',
                background: isActive ? '#111111' : 'transparent',
                color: isActive ? '#FFFFFF' : '#6B6B6B',
                border: isActive ? '1px solid #111111' : '1px solid transparent'
              }}
              onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = '#F5F5F5')}
              onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = 'transparent')}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'transactions' && <TransactionsTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'budget' && <BudgetTab />}
        {activeTab === 'reconciliation' && <ReconciliationTab />}
      </div>
    </div>
  )
}
