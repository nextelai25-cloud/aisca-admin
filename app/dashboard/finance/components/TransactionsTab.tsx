'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Plus, Download, ArrowRight, Flag, X, User } from 'lucide-react'

export default function TransactionsTab() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Drawer State
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [billFile, setBillFile] = useState<File | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    type: 'income',
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    cash_or_bank: 'bank',
    fund: 'General Fund',
    event_project: '',
    bank_reference_number: '',
    invoice_number: ''
  })

  // Categories
  const incomeCategories = ['Membership Fees', 'Event Registration Fees', 'Product Sales', 'Sponsorship', 'Donations', 'Grants', 'Other Income']
  const expenseCategories = ['Food & Beverages', 'Transportation', 'Venue Hire', 'Printing & Stationery', 'Marketing & Promotions', 'Awards & Trophies', 'Equipment & Supplies', 'Bank Charges', 'Charity & CSR', 'Other Expenses']
  
  const funds = ['General Fund', 'Event Fund', 'Merchandise Fund', 'Charity Fund']

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
          ),
          admin_users:recorded_by (
            name
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

  async function handleSaveTransaction(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      // 1. Get current user
      const { data: { session } } = await supabase.auth.getSession()
      let recordedBy = null
      
      if (session?.user?.id) {
        // Find admin_user id matching auth user
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('id')
          .eq('email', session.user.email)
          .single()
        if (adminUser) {
          recordedBy = adminUser.id
        }
      }

      // 1.5 Handle File Upload
      let billUrl = null
      let billFilename = null
      if (billFile) {
        const fileExt = billFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('finance_attachments')
          .upload(fileName, billFile)
        
        if (uploadError) {
          console.error("Upload error:", uploadError)
          // We don't fail the whole transaction if upload fails, but we can log it.
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('finance_attachments')
            .getPublicUrl(fileName)
          billUrl = publicUrlData.publicUrl
          billFilename = billFile.name
        }
      }

      // 2. Insert into finance_ledger
      const { data: insertedLedger, error: ledgerError } = await supabase
        .from('finance_ledger')
        .insert([{
          type: formData.type,
          category: formData.category || (formData.type === 'income' ? incomeCategories[0] : expenseCategories[0]),
          description: formData.description,
          amount: Number(formData.amount),
          date: formData.date,
          cash_or_bank: formData.cash_or_bank,
          fund: formData.fund,
          event_project: formData.event_project || null,
          recorded_by: recordedBy,
          bill_url: billUrl,
          bill_filename: billFilename
        }])
        .select()
        .single()

      if (ledgerError) throw ledgerError

      // 3. Insert into finance_ledger_details if needed
      if (formData.bank_reference_number || formData.invoice_number) {
        const { error: detailsError } = await supabase
          .from('finance_ledger_details')
          .insert([{
            ledger_entry_id: insertedLedger.id,
            bank_reference_number: formData.bank_reference_number || null,
            invoice_number: formData.invoice_number || null
          }])
        if (detailsError) throw detailsError
      }

      // Success
      setShowModal(false)
      setFormData({
        type: 'income',
        category: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        cash_or_bank: 'bank',
        fund: 'General Fund',
        event_project: '',
        bank_reference_number: '',
        invoice_number: ''
      })
      setBillFile(null)
      await fetchLedger() // Refresh

    } catch (err) {
      console.error("Error saving transaction:", err)
      alert("Failed to save transaction.")
    } finally {
      setIsSubmitting(false)
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
          <button 
            onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#111111', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
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
                  {['Date', 'Type', 'Category', 'Description', 'Bank Ref #', 'Recorded By', 'Amount', ''].map((th, i) => (
                    <th key={i} style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {th}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#6B6B6B', fontSize: '14px' }}>No transactions found.</td>
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
                      <td style={{ padding: '16px 24px', fontSize: '13px', color: '#6B6B6B' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={12} />
                          {entry.admin_users?.name || 'Legacy Entry'}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: entry.type === 'income' ? '#22C55E' : '#EF4444', fontWeight: '700', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {entry.type === 'income' ? '+' : '-'} LKR {Number(entry.amount).toLocaleString()}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <button 
                          onClick={() => setSelectedEntry(entry)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#A3A3A3' }}>
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

      {/* Record Transaction Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111111' }}>Record Transaction</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A3A3A3' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#6B6B6B', marginBottom: '8px' }}>Type</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value, category: ''})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#6B6B6B', marginBottom: '8px' }}>Category</label>
                  <select 
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">Select Category...</option>
                    {(formData.type === 'income' ? incomeCategories : expenseCategories).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6B6B6B', marginBottom: '8px' }}>Description</label>
                <input 
                  required
                  type="text"
                  placeholder="E.g. Monthly membership fee for John Doe"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#6B6B6B', marginBottom: '8px' }}>Amount (LKR)</label>
                  <input 
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#6B6B6B', marginBottom: '8px' }}>Date</label>
                  <input 
                    required
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#6B6B6B', marginBottom: '8px' }}>Payment Method</label>
                  <select 
                    value={formData.cash_or_bank}
                    onChange={(e) => setFormData({...formData, cash_or_bank: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="bank">Bank Transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#6B6B6B', marginBottom: '8px' }}>Fund Allocation</label>
                  <select 
                    value={formData.fund}
                    onChange={(e) => setFormData({...formData, fund: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }}
                  >
                    {funds.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.cash_or_bank === 'bank' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#6B6B6B', marginBottom: '8px' }}>Bank Reference Number (Optional)</label>
                  <input 
                    type="text"
                    placeholder="e.g. REF-12345"
                    value={formData.bank_reference_number}
                    onChange={(e) => setFormData({...formData, bank_reference_number: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6B6B6B', marginBottom: '8px' }}>Event / Project Tag (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g. AGM 2026"
                  value={formData.event_project}
                  onChange={(e) => setFormData({...formData, event_project: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6B6B6B', marginBottom: '8px' }}>Bill / Receipt Attachment (Optional)</label>
                <input 
                  type="file"
                  accept="image/jpeg, image/png, application/pdf"
                  onChange={(e) => setBillFile(e.target.files ? e.target.files[0] : null)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '13px', outline: 'none', background: '#F9F9F9' }}
                />
                <p style={{ fontSize: '11px', color: '#A3A3A3', marginTop: '4px' }}>JPG, PNG, or PDF. Max 5MB.</p>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid #E8E8E8', background: '#FFFFFF', color: '#111111', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: '#111111', color: '#FFFFFF', fontSize: '14px', fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'Saving...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer (Simplified) */}
      {selectedEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}>
          <div style={{ background: '#FFFFFF', width: '100%', maxWidth: '400px', height: '100vh', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111111' }}>Transaction Details</h2>
              <button onClick={() => setSelectedEntry(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A3A3A3' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Amount</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: selectedEntry.type === 'income' ? '#22C55E' : '#EF4444' }}>
                  {selectedEntry.type === 'income' ? '+' : '-'} LKR {Number(selectedEntry.amount).toLocaleString()}
                </p>
              </div>

              <div style={{ height: '1px', background: '#E8E8E8' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '12px', color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Date</p>
                  <p style={{ fontSize: '14px', color: '#111111', fontWeight: '500' }}>{new Date(selectedEntry.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Type</p>
                  <p style={{ fontSize: '14px', color: '#111111', fontWeight: '500', textTransform: 'capitalize' }}>{selectedEntry.type}</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Category</p>
                  <p style={{ fontSize: '14px', color: '#111111', fontWeight: '500' }}>{selectedEntry.category}</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Fund</p>
                  <p style={{ fontSize: '14px', color: '#111111', fontWeight: '500' }}>{selectedEntry.fund}</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Method</p>
                  <p style={{ fontSize: '14px', color: '#111111', fontWeight: '500', textTransform: 'capitalize' }}>{selectedEntry.cash_or_bank}</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Event / Project</p>
                  <p style={{ fontSize: '14px', color: '#111111', fontWeight: '500' }}>{selectedEntry.event_project || '-'}</p>
                </div>
              </div>

              <div style={{ height: '1px', background: '#E8E8E8' }} />

              <div>
                <p style={{ fontSize: '12px', color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Description</p>
                <p style={{ fontSize: '14px', color: '#111111', lineHeight: '1.5' }}>{selectedEntry.description}</p>
              </div>

              <div>
                <p style={{ fontSize: '12px', color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Bank Reference</p>
                <p style={{ fontSize: '14px', color: '#111111', fontFamily: 'monospace' }}>{selectedEntry.finance_ledger_details?.bank_reference_number || '-'}</p>
              </div>

              {selectedEntry.bill_url && (
                <div>
                  <p style={{ fontSize: '12px', color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Attachment</p>
                  <a href={selectedEntry.bill_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontSize: '14px', color: '#3B82F6', textDecoration: 'underline' }}>
                    {selectedEntry.bill_filename || 'View Receipt'}
                  </a>
                </div>
              )}

              <div style={{ height: '1px', background: '#E8E8E8' }} />

              <div>
                <p style={{ fontSize: '12px', color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Recorded By</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={12} color="#6B6B6B" />
                  </div>
                  <p style={{ fontSize: '14px', color: '#111111', fontWeight: '500' }}>{selectedEntry.admin_users?.name || 'Legacy Entry'}</p>
                </div>
                {selectedEntry.recorded_by === null && (
                  <p style={{ fontSize: '12px', color: '#F59E0B', marginTop: '8px' }}>* This is a historical entry imported before attribution tracking was enabled.</p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}
