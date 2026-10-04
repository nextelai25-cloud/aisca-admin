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
        <h1 className="text-large-title font-bold tracking-tight text-[#1D1D1F]">Finance Command Center</h1>
        <p className="text-body text-[#6E6E73] mt-1">Comprehensive Financial Management & Reporting</p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 pb-4 border-b border-[#E5E5EA]">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '10px',
                fontSize: '13px', fontWeight: 'bold', textTransform: 'capitalize', transition: 'var(--transition-control)',
                background: isActive ? '#1D1D1F' : 'transparent',
                color: isActive ? '#FFFFFF' : '#6E6E73',
                border: isActive ? '1px solid #1D1D1F' : '1px solid transparent'
              }}
              onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = '#F5F5F7')}
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
