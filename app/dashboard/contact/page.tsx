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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider uppercase text-white font-display">
            CONTACT MESSAGES
          </h1>
          <p className="text-xs text-gray-500 tracking-widest mt-1 uppercase">
            Manage inquiries, feedback, and affiliate requests
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search inquiries..."
            className="w-full bg-[#0b0b0b] border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-gray-600 outline-none focus:border-white/15 transition-all"
          />
        </div>
      </div>

      {/* Messages List / Table */}
      <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-500 uppercase tracking-widest">
            Loading contact registry...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="py-20 text-center text-xs text-gray-500 uppercase tracking-widest">
            No contact messages found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="px-6 py-4 text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Sender</th>
                  <th className="px-6 py-4 text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Subject</th>
                  <th className="px-6 py-4 text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Message Preview</th>
                  <th className="px-6 py-4 text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Date Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredMessages.map((msg) => (
                  <tr
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className="hover:bg-white/[0.01] cursor-pointer transition-all duration-200"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-white truncate max-w-[180px]">{msg.name}</span>
                        <span className="text-[10px] text-gray-500 truncate max-w-[180px]">{msg.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-white/90 truncate max-w-[180px] block">
                        {msg.subject}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500 truncate max-w-[280px] block font-light">
                        {msg.message}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 font-mono">
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
          <div className="relative w-full max-w-lg h-full bg-[#0b0b0b] border-l border-white/5 p-8 flex flex-col justify-between overflow-y-auto z-10 transition-transform duration-300 transform translate-x-0">
            <div className="space-y-8">
              {/* Header */}
              <div className="flex items-center justify-between pb-6 border-b border-white/5">
                <div className="flex items-center gap-3 text-[#d4af37]">
                  <MessageSquare size={20} />
                  <span className="text-xs font-extrabold uppercase tracking-widest">Message details</span>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-gray-500 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Details Section */}
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold tracking-widest text-gray-500 uppercase">Sender Name</span>
                  <div className="flex items-center gap-2.5 text-xs text-white bg-white/[0.02] border border-white/5 px-4 py-3 rounded-xl font-semibold">
                    <User size={14} className="text-[#d4af37]" />
                    <span>{selectedMessage.name}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold tracking-widest text-gray-500 uppercase">Email Address</span>
                  <div className="flex items-center gap-2.5 text-xs text-white bg-white/[0.02] border border-white/5 px-4 py-3 rounded-xl font-mono">
                    <Mail size={14} className="text-[#d4af37]" />
                    <span>{selectedMessage.email}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold tracking-widest text-gray-500 uppercase">Subject Topic</span>
                  <div className="flex items-center gap-2.5 text-xs text-white bg-white/[0.02] border border-white/5 px-4 py-3 rounded-xl font-semibold">
                    <FileText size={14} className="text-[#d4af37]" />
                    <span>{selectedMessage.subject}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold tracking-widest text-gray-500 uppercase">Message Text</span>
                  <div className="text-xs text-white/80 bg-white/[0.02] border border-white/5 px-4 py-4 rounded-xl leading-relaxed whitespace-pre-wrap font-light">
                    {selectedMessage.message}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-white/5 mt-8 flex items-center justify-between text-[10px] text-gray-600 font-mono">
              <div className="flex items-center gap-1.5">
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
