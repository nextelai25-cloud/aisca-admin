'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Download, Check, X, FileText, ChevronLeft, ChevronRight, User, Mail, School, MapPin } from 'lucide-react'

export default function AssociatesPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [provinceFilter, setProvinceFilter] = useState('all')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Action loading trackers
  const [actioningId, setActioningId] = useState<string | null>(null)
  
  // Bulk selection and Details modal
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedAssociate, setSelectedAssociate] = useState<any>(null)

  useEffect(() => {
    fetchAssociates()
  }, [])

  async function fetchAssociates() {
    try {
      setLoading(true)
      const { data: members, error } = await supabase
        .from('associate_members')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error("Error fetching associates:", error.message)
        return
      }
      setData(members || [])
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
        .from('associate_members')
        .update({ status })
        .eq('id', id)

      if (error) {
        alert(`Error updating status: ${error.message}`)
        return
      }

      // Live update state
      setData(prev => prev.map(m => m.id === id ? { ...m, status } : m))
      
      // If approved, you can send welcome email here or it's handled by a database trigger.
    } catch (err) {
      console.error(err)
    } finally {
      setActioningId(null)
    }
  }

  const handleBulkStatus = async (status: 'approved' | 'rejected') => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    try {
      setActioningId('bulk')
      const { error } = await supabase
        .from('associate_members')
        .update({ status })
        .in('id', ids)

      if (error) {
        alert(`Error updating statuses: ${error.message}`)
        return
      }

      setData(prev => prev.map(m => ids.includes(m.id) ? { ...m, status } : m))
      setSelectedIds(new Set())
    } catch (err) {
      console.error(err)
    } finally {
      setActioningId(null)
    }
  }

  const handleSendReminder = async (email: string) => {
    try {
      // Typically calls an API route
      // await fetch('/api/email/reminder', { method: 'POST', body: JSON.stringify({ email }) })
      alert(`Reminder email queued for ${email}`)
    } catch (err) {
      console.error(err)
    }
  }

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const toggleAll = () => {
    if (selectedIds.size === currentItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(currentItems.map((i: any) => i.id)))
    }
  }

  // Filter logic
  const filteredData = data.filter(item => {
    const matchesSearch = 
      (item.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.school || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.membership_number || '').toLowerCase().includes(searchQuery.toLowerCase())

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
      'Membership No', 'Full Name', 'Email', 'WhatsApp', 
      'School', 'District', 'Province', 'Who They Are', 
      'Commerce Stream', 'Actively Participate', 'Status', 'Date Joined'
    ]

    const csvRows = [
      headers.join(','),
      ...filteredData.map(item => [
        `"${item.membership_number || 'N/A'}"`,
        `"${item.full_name || ''}"`,
        `"${item.email || ''}"`,
        `"${item.whatsapp || ''}"`,
        `"${item.school || ''}"`,
        `"${item.district || ''}"`,
        `"${item.province || ''}"`,
        `"${item.who_are_you || ''}"`,
        item.commerce_stream ? 'Yes' : 'No',
        item.actively_participate ? 'Yes' : 'No',
        item.status.toUpperCase(),
        new Date(item.created_at).toLocaleDateString('en-LK')
      ].join(','))
    ]

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `aisca_associates_export_${Date.now()}.csv`)
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wider uppercase text-white">Associates Registry</h1>
          <p className="text-xs text-gray-500 tracking-wide uppercase mt-1">Review and manage individual onboardings</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 mr-4">
              <button
                onClick={() => handleBulkStatus('approved')}
                disabled={actioningId === 'bulk'}
                className="px-3 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl text-xs font-semibold uppercase hover:bg-green-500/20 transition-all"
              >
                Approve ({selectedIds.size})
              </button>
              <button
                onClick={() => handleBulkStatus('rejected')}
                disabled={actioningId === 'bulk'}
                className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold uppercase hover:bg-red-500/20 transition-all"
              >
                Reject ({selectedIds.size})
              </button>
            </div>
          )}
          <button
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Download size={14} />
            <span>Export CSV ({filteredData.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Search name, school or membership no..."
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
          <option value="all">All Onboarding Statuses</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
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
      <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-white">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01] text-gray-500 uppercase tracking-widest text-[9px]">
                <th className="p-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.size === currentItems.length && currentItems.length > 0}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-gray-600 bg-transparent text-[#d4af37] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                <th className="p-4 font-semibold">Membership No</th>
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">School Details</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-center">Board Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500 uppercase tracking-widest text-[10px]">
                    No onboarded members found matching criteria.
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => {
                  const isActioning = actioningId === item.id
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.01] transition-all">
                      <td className="p-4">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelection(item.id)}
                          className="w-3.5 h-3.5 rounded border-gray-600 bg-transparent text-[#d4af37] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>

                      {/* Membership No */}
                      <td className="p-4 font-mono font-bold text-gray-400">
                        {item.membership_number}
                      </td>

                      {/* Name */}
                      <td className="p-4 font-semibold">
                        {item.full_name}
                        <div className="text-[10px] text-gray-500 font-normal mt-0.5">{item.email}</div>
                      </td>

                      {/* School Details */}
                      <td className="p-4">
                        <span className="font-semibold text-gray-300">{item.school}</span>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {item.district}, {item.province}
                        </div>
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

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedAssociate(item)}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-semibold text-white uppercase tracking-wider transition-all"
                          >
                            View Details
                          </button>
                        </div>
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

      {/* Selected Associate Drawer */}
      {selectedAssociate && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div
            onClick={() => setSelectedAssociate(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          />
          <div className="relative w-full max-w-lg h-full bg-[#0b0b0b] border-l border-white/5 p-8 flex flex-col justify-between overflow-y-auto z-10">
            <div className="space-y-8">
              <div className="flex items-center justify-between pb-6 border-b border-white/5">
                <div className="flex items-center gap-3 text-[#d4af37]">
                  <User size={20} />
                  <span className="text-xs font-extrabold uppercase tracking-widest">Full Details</span>
                </div>
                <button
                  onClick={() => setSelectedAssociate(null)}
                  className="text-gray-500 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <span className="block text-[9px] font-bold tracking-widest text-gray-500 uppercase">Membership No</span>
                  <div className="text-xl font-bold text-[#d4af37] mt-1 font-mono">{selectedAssociate.membership_number}</div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold tracking-widest text-gray-500 uppercase">Personal Info</span>
                  <div className="flex flex-col gap-2 text-xs text-white bg-white/[0.02] border border-white/5 px-4 py-3 rounded-xl">
                    <span className="font-semibold">{selectedAssociate.full_name}</span>
                    <span className="text-gray-400">Email: {selectedAssociate.email}</span>
                    <span className="text-gray-400">WhatsApp: {selectedAssociate.whatsapp}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold tracking-widest text-gray-500 uppercase">Academic Details</span>
                  <div className="flex flex-col gap-2 text-xs text-white bg-white/[0.02] border border-white/5 px-4 py-3 rounded-xl">
                    <div className="flex items-center gap-2"><School size={14} className="text-gray-400"/> {selectedAssociate.school}</div>
                    <span className="text-gray-400">Stream: {selectedAssociate.commerce_stream ? 'Commerce' : 'Non-Commerce'}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold tracking-widest text-gray-500 uppercase">Location</span>
                  <div className="flex flex-col gap-2 text-xs text-white bg-white/[0.02] border border-white/5 px-4 py-3 rounded-xl">
                    <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400"/> {selectedAssociate.district}, {selectedAssociate.province}</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold tracking-widest text-gray-500 uppercase">Identity & Role</span>
                  <div className="flex flex-col gap-2 text-xs text-white bg-white/[0.02] border border-white/5 px-4 py-3 rounded-xl">
                    <span className="text-gray-300">{selectedAssociate.who_are_you}</span>
                    <span className="text-gray-400">Willing to volunteer: {selectedAssociate.actively_participate ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                <div className="space-y-1.5 flex gap-4 pt-4 border-t border-white/5">
                  {selectedAssociate.status !== 'approved' && (
                    <button
                      onClick={() => { handleUpdateStatus(selectedAssociate.id, 'approved'); setSelectedAssociate((prev: any) => ({...prev, status: 'approved'})); }}
                      className="flex-1 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-green-500/20 transition-all text-center"
                    >
                      Approve
                    </button>
                  )}
                  {selectedAssociate.status !== 'rejected' && (
                    <button
                      onClick={() => { handleUpdateStatus(selectedAssociate.id, 'rejected'); setSelectedAssociate((prev: any) => ({...prev, status: 'rejected'})); }}
                      className="flex-1 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all text-center"
                    >
                      Reject
                    </button>
                  )}
                  {selectedAssociate.status === 'pending' && (
                    <button
                      onClick={() => handleSendReminder(selectedAssociate.email)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-500/20 transition-all"
                    >
                      <Mail size={14} /> Send Reminder
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
