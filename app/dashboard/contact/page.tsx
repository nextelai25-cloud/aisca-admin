'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MessageSquare, Calendar, User, Mail, FileText, Search, X } from 'lucide-react'

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchMessages()
  }, [])

  async function fetchMessages() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMessages(data || [])
    } catch (err: any) {
      console.error('Error fetching contact messages:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredMessages = messages.filter(msg => {
    const q = searchQuery.toLowerCase()
    return (
      msg.name.toLowerCase().includes(q) ||
      msg.email.toLowerCase().includes(q) ||
      msg.subject.toLowerCase().includes(q) ||
      msg.message.toLowerCase().includes(q)
    )
  })

  const handleSelectMessage = async (msg: any) => {
    setSelectedMessage(msg)
    if (!msg.read) {
      // Mark as read in DB
      await supabase.from('contact_messages').update({ read: true }).eq('id', msg.id)
      // Update local state
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m))
      
      // Update the badge in layout by triggering a custom event or reloading window if needed,
      // but standard React state will handle the row itself.
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-large-title font-bold tracking-tight text-[#1D1D1F] font-display">
            CONTACT MESSAGES
          </h1>
          <p className="text-body text-[#6E6E73] mt-1 ">
            Manage inquiries, feedback, and affiliate requests
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E6E73]" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search inquiries..."
            className="w-full bg-[#FFFFFF] border border-[#E5E5EA] rounded-control pl-11 pr-4 py-3 text-body text-[#1D1D1F] placeholder-[#86868B] outline-none focus:border-white/15 transition"
          />
        </div>
      </div>

      {/* Messages List / Table */}
      <div className="bg-[#FFFFFF] border border-[#E5E5EA] rounded-card overflow-hidden admin-table-wrapper">
        {loading ? (
          <div className="py-20 text-center text-body text-[#6E6E73] ">
            Loading contact registry...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="py-20 text-center text-body text-[#6E6E73] ">
            No contact messages found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E5EA] bg-[#FBFBFD]">
                  <th className="px-6 py-4 text-caption font-bold uppercase tracking-[0.04em] text-[#6E6E73]">Sender</th>
                  <th className="px-6 py-4 text-caption font-bold uppercase tracking-[0.04em] text-[#6E6E73]">Subject</th>
                  <th className="px-6 py-4 text-caption font-bold uppercase tracking-[0.04em] text-[#6E6E73]">Message Preview</th>
                  <th className="px-6 py-4 text-caption font-bold uppercase tracking-[0.04em] text-[#6E6E73]">Date Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredMessages.map((msg) => (
                  <tr
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`cursor-pointer transition duration-200 ${msg.read ? 'hover:bg-[#FBFBFD]' : 'bg-[#FBF7EC] hover:bg-[#F5EFDD] border-l-2 border-l-[#d4af37]'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`text-body truncate max-w-[180px] ${msg.read ? 'font-bold text-[#1D1D1F]' : 'font-bold text-[#8A6D1C]'}`}>{msg.name}</span>
                        <span className="text-caption text-[#6E6E73] truncate max-w-[180px]">{msg.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-body font-semibold text-[#1D1D1F]/90 truncate max-w-[180px] block">
                        {msg.subject}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-body text-[#6E6E73] truncate max-w-[280px] block font-light">
                        {msg.message}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-body text-gray-600 font-mono">
                      {new Date(msg.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide Drawer Detail View */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedMessage(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Panel */}
          <div className="relative w-full max-w-lg h-full bg-[#FFFFFF] border-l border-[#E5E5EA] p-8 flex flex-col justify-between overflow-y-auto z-10 transition-transform duration-300 transform translate-x-0">
            <div className="space-y-8">
              {/* Header */}
              <div className="flex items-center justify-between pb-6 border-b border-[#E5E5EA]">
                <div className="flex items-center gap-3 text-[#8A6D1C]">
                  <MessageSquare size={20} />
                  <span className="text-body font-bold ">Message details</span>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-[#6E6E73] hover:text-[#1D1D1F] transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Details Section */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="block text-caption font-bold tracking-[0.04em] text-[#6E6E73] uppercase">Sender Name</span>
                  <div className="flex items-center gap-3 text-body text-[#1D1D1F] bg-white/[0.02] border border-[#E5E5EA] px-4 py-3 rounded-control font-semibold">
                    <User size={14} className="text-[#8A6D1C]" />
                    <span>{selectedMessage.name}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-caption font-bold tracking-[0.04em] text-[#6E6E73] uppercase">Email Address</span>
                  <div className="flex items-center gap-3 text-body text-[#1D1D1F] bg-white/[0.02] border border-[#E5E5EA] px-4 py-3 rounded-control font-mono">
                    <Mail size={14} className="text-[#8A6D1C]" />
                    <span>{selectedMessage.email}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-caption font-bold tracking-[0.04em] text-[#6E6E73] uppercase">Subject Topic</span>
                  <div className="flex items-center gap-3 text-body text-[#1D1D1F] bg-white/[0.02] border border-[#E5E5EA] px-4 py-3 rounded-control font-semibold">
                    <FileText size={14} className="text-[#8A6D1C]" />
                    <span>{selectedMessage.subject}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-caption font-bold tracking-[0.04em] text-[#6E6E73] uppercase">Message Text</span>
                  <div className="text-body text-[#1D1D1F]/80 bg-white/[0.02] border border-[#E5E5EA] px-4 py-4 rounded-control leading-relaxed whitespace-pre-wrap font-light">
                    {selectedMessage.message}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-[#E5E5EA] mt-8 flex items-center justify-between text-caption text-gray-600 font-mono">
              <div className="flex items-center gap-2">
                <Calendar size={12} />
                <span>Received: {new Date(selectedMessage.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
