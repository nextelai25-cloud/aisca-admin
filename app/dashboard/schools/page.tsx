'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Download, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'

export default function SchoolsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [provinceFilter, setProvinceFilter] = useState('all')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Action loading tracker
  const [actioningId, setActioningId] = useState<string | null>(null)

  // Access Control & Export History Tab
  const [adminUser, setAdminUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'registry' | 'exports'>('registry')
  const [exportLogs, setExportLogs] = useState<any[]>([])

  useEffect(() => {
    fetchSchools()
    fetchUser()
  }, [])

  async function fetchUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setAdminUser({
        email: session.user.email,
        role: session.user.user_metadata?.role || 'board_member',
        name: session.user.user_metadata?.name || 'Admin Board'
      })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently delete ${name}? This cannot be undone.`)) return
    const { error } = await supabase.from('school_registrations').delete().eq('id', id)
    if (!error) {
      setData(prev => prev.filter(m => m.id !== id))
      // Log the deletion
      await supabase.from('audit_log').insert([{
        action: 'DELETE_SCHOOL',
        target_id: id,
        target_name: name,
        performed_by: adminUser?.email || 'unknown',
        performed_at: new Date().toISOString()
      }])
    } else {
      alert(`Delete failed: ${error.message}`)
    }
  }

  const handleRequestAccess = async (section: string) => {
    try {
      await fetch('/api/notify-chairman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `🔐 *ACCESS REQUEST*\n\n${adminUser?.name || 'Admin'} (${adminUser?.role || 'board_member'}) is requesting access to: *${section}*\n\nLogin to admin panel to review: ${window.location.origin}/dashboard/settings`
        })
      })
      alert('Access request sent to Chairman.')
    } catch (err: any) {
      alert(`Request failed: ${err.message}`)
    }
  }

  const handleExport = async () => {
    const reason = prompt('Please enter the reason for this export:')
    if (!reason) return
    
    // Log the export
    await supabase.from('audit_log').insert([{
      action: 'EXPORT_SCHOOLS',
      target_name: `${filteredData.length} records`,
      performed_by: adminUser?.email || 'unknown',
      reason: reason,
      performed_at: new Date().toISOString()
    }])
    
    // Proceed with CSV export
    handleExportCSV()
  }

  const fetchExportLogs = async () => {
    const { data: logs, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('action', 'EXPORT_SCHOOLS')
      .order('performed_at', { ascending: false })
    if (!error) {
      setExportLogs(logs || [])
    }
  }

  async function fetchSchools() {
    try {
      setLoading(true)
      const { data: schools, error } = await supabase
        .from('school_registrations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error("Error fetching schools:", error.message)
        return
      }
      setData(schools || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setActioningId(id)
      const { error } = await supabase
        .from('school_registrations')
        .update({ status })
        .eq('id', id)

      if (error) {
        alert(`Error updating status: ${error.message}`)
        return
      }

      // Update state dynamically
      setData(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    } catch (err) {
      console.error(err)
    } finally {
      setActioningId(null)
    }
  }

  // Filter logic
  const filteredData = data.filter(item => {
    const matchesSearch = 
      (item.school_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.commerce_society_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.master_in_charge_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.student_president_name || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const matchesProvince = provinceFilter === 'all' || item.province === provinceFilter

    return matchesSearch && matchesStatus && matchesProvince
  })

  // Pagination math
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  const handlePageChange = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum)
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) return

    const headers = [
      'School Name', 'Province', 'District', 'Society Name', 
      'Society Email', 'MIC Name', 'MIC Email', 'MIC Phone', 
      'President Name', 'President Email', 'President Phone', 'Status', 'Date Submitted'
    ]

    const csvRows = [
      headers.join(','),
      ...filteredData.map(item => [
        `"${item.school_name || ''}"`,
        `"${item.province || ''}"`,
        `"${item.district || ''}"`,
        `"${item.commerce_society_name || ''}"`,
        `"${item.commerce_society_email || ''}"`,
        `"${item.master_in_charge_name || ''}"`,
        `"${item.master_in_charge_email || ''}"`,
        `"${item.master_in_charge_phone || ''}"`,
        `"${item.student_president_name || ''}"`,
        `"${item.student_president_email || ''}"`,
        `"${item.student_president_phone || ''}"`,
        item.status.toUpperCase(),
        new Date(item.created_at).toLocaleDateString('en-LK')
      ].join(','))
    ]

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `aisca_schools_export_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const provinces = [
    'Western Province', 'Central Province', 'Southern Province',
    'Northern Province', 'Eastern Province', 'North Western Province',
    'North Central Province', 'Uva Province', 'Sabaragamuwa Province', 'Other'
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-t-2 border-r-2 border-[#d4af37] rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 admin-page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-wider uppercase text-white">Schools Registry</h1>
          <p className="text-xs text-gray-500 tracking-wide uppercase mt-1">Audit and approve school Commerce Societies</p>
        </div>
        <button
          onClick={handleExport}
          disabled={filteredData.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all admin-export-btn"
        >
          <Download size={14} />
          <span>Export CSV ({filteredData.length})</span>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-4 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('registry')}
          className={`text-xs uppercase font-bold tracking-wider pb-2 px-1 transition-all ${
            activeTab === 'registry' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-gray-400 hover:text-white'
          }`}
        >
          Registry
        </button>
        <button
          onClick={() => { setActiveTab('exports'); fetchExportLogs(); }}
          className={`text-xs uppercase font-bold tracking-wider pb-2 px-1 transition-all ${
            activeTab === 'exports' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-gray-400 hover:text-white'
          }`}
        >
          Export History
        </button>
      </div>

      {activeTab === 'exports' ? (
        <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl overflow-hidden shadow-xl p-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Past Exports History</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-white">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01] text-gray-500 uppercase tracking-widest text-[9px]">
                  <th className="p-4 font-semibold">Who (User)</th>
                  <th className="p-4 font-semibold">When (Date)</th>
                  <th className="p-4 font-semibold">Records Exported</th>
                  <th className="p-4 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {exportLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500 uppercase tracking-widest text-[10px]">
                      No export logs recorded.
                    </td>
                  </tr>
                ) : (
                  exportLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.01] transition-all">
                      <td className="p-4 font-semibold">{log.performed_by}</td>
                      <td className="p-4 text-gray-400">
                        {new Date(log.performed_at).toLocaleString('en-LK')}
                      </td>
                      <td className="p-4 font-mono font-bold text-gray-300">{log.target_name}</td>
                      <td className="p-4 text-gray-400">{log.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 admin-filters-row">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Search school name, society or student president..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-11 pr-4 py-3 bg-[#0b0b0b] border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="w-full px-4 py-3 bg-[#0b0b0b] border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-white/20 transition-all cursor-pointer"
        >
          <option value="all">All Society Statuses</option>
          <option value="pending">Pending Board Review</option>
          <option value="approved">Approved Societies</option>
          <option value="rejected">Rejected Societies</option>
        </select>

        {/* Province Filter */}
        <select
          value={provinceFilter}
          onChange={e => { setProvinceFilter(e.target.value); setCurrentPage(1); }}
          className="w-full px-4 py-3 bg-[#0b0b0b] border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-white/20 transition-all cursor-pointer"
        >
          <option value="all">All Provinces</option>
          {provinces.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl overflow-hidden shadow-xl admin-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-white">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01] text-gray-500 uppercase tracking-widest text-[9px]">
                <th className="p-4 font-semibold">School Name</th>
                <th className="p-4 font-semibold">Province & District</th>
                <th className="p-4 font-semibold">Commerce Society</th>
                <th className="p-4 font-semibold">Master-In-Charge</th>
                <th className="p-4 font-semibold">Student President</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Date Registered</th>
                <th className="p-4 font-semibold text-center">Board Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 uppercase tracking-widest text-[10px]">
                    No registered schools found matching criteria.
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => {
                  const isActioning = actioningId === item.id
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.01] transition-all">
                      {/* School Name */}
                      <td className="p-4 font-semibold text-gray-200">
                        {item.school_name}
                      </td>

                      {/* Province & District */}
                      <td className="p-4">
                        <span className="font-semibold text-gray-300">{item.district}</span>
                        <div className="text-[10px] text-gray-500 mt-0.5">{item.province}</div>
                      </td>

                      {/* Society Name */}
                      <td className="p-4">
                        <span className="font-semibold text-gray-300">{item.commerce_society_name}</span>
                        <div className="text-[10px] text-gray-500 mt-0.5">{item.commerce_society_email}</div>
                      </td>

                      {/* MIC Details */}
                      <td className="p-4">
                        <span className="font-semibold text-gray-300">{item.master_in_charge_name}</span>
                        <div className="text-[10px] text-gray-500 mt-0.5">Email: {item.master_in_charge_email}</div>
                        <div className="text-[10px] text-gray-500">Phone: {item.master_in_charge_phone}</div>
                      </td>

                      {/* President Details */}
                      <td className="p-4">
                        <span className="font-semibold text-gray-300">{item.student_president_name}</span>
                        <div className="text-[10px] text-gray-500 mt-0.5">Email: {item.student_president_email}</div>
                        <div className="text-[10px] text-gray-500">Phone: {item.student_president_phone}</div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${
                          item.status === 'approved' 
                            ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                            : item.status === 'rejected'
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="p-4 text-gray-400">
                        {new Date(item.created_at).toLocaleDateString('en-LK')}
                      </td>

                      {/* Board Actions */}
                      <td className="p-4">
                        {isActioning ? (
                          <div className="flex justify-center">
                            <div className="w-4 h-4 border-2 border-t-transparent border-[#d4af37] rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            {item.status !== 'approved' && (
                              <button
                                onClick={() => handleUpdateStatus(item.id, 'approved')}
                                title="Approve School"
                                className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 flex items-center justify-center transition-all"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            {item.status !== 'rejected' && (
                              <button
                                onClick={() => handleUpdateStatus(item.id, 'rejected')}
                                title="Reject School"
                                className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-all"
                              >
                                <X size={14} />
                              </button>
                            )}
                            {adminUser?.role === 'chairman' ? (
                              <button
                                onClick={() => handleDelete(item.id, item.school_name)}
                                style={{
                                  padding: '6px 12px', background: 'transparent',
                                  border: '1px solid rgba(255,0,0,0.3)', borderRadius: '6px',
                                  color: 'rgba(255,80,80,0.8)', cursor: 'pointer', fontSize: '12px'
                                }}
                              >
                                Delete
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRequestAccess('schools')}
                                style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '11px' }}
                              >
                                Request View Access
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-between gap-4">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">
              Page {currentPage} of {totalPages} ({filteredData.length} total entries)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  )
}
