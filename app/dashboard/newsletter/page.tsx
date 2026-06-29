'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Mail, Users, Send, CheckCircle, AlertTriangle } from 'lucide-react'

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [errMessage, setErrMessage] = useState('')

  useEffect(() => {
    fetchSubscribers()
  }, [])

  async function fetchSubscribers() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false })
      
      if (error) throw error
      setSubscribers(data || [])
    } catch (err: any) {
      console.error('Error fetching newsletter subscribers:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendNewsletter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject || !htmlContent) return
    
    setSending(true)
    setMessage('')
    setErrMessage('')
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subject, html: htmlContent })
      })
      
      const data = await res.json()
      if (res.ok && data.success) {
        setMessage(`✓ Newsletter successfully sent to ${data.sent} active subscribers!`)
        setSubject('')
        setHtmlContent('')
      } else {
        setErrMessage(data.error || 'Failed to dispatch email campaign.')
      }
    } catch (err: any) {
      setErrMessage(`Error: ${err.message || 'An unexpected error occurred.'}`)
    } finally {
      setSending(false)
    }
  }

  const activeSubscribers = subscribers.filter(s => s.active)

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider uppercase text-[#111111] font-display">
            NEWSLETTER HUB
          </h1>
          <p className="text-xs text-[#6B6B6B] tracking-widest mt-1 uppercase">
            Broadcast messages and manage newsletter subscriptions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-2xl p-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-[#F5F5F5] border border-[#E8E8E8] flex items-center justify-center text-[#d4af37]">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[10px] tracking-widest uppercase text-[#6B6B6B] font-semibold">Total Subscribers</span>
            <h3 className="text-2xl font-bold text-[#111111] mt-1">{subscribers.length}</h3>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-2xl p-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-[#F5F5F5] border border-[#E8E8E8] flex items-center justify-center text-green-500">
            <CheckCircle size={22} />
          </div>
          <div>
            <span className="text-[10px] tracking-widest uppercase text-[#6B6B6B] font-semibold">Active Subscriptions</span>
            <h3 className="text-2xl font-bold text-[#111111] mt-1">{activeSubscribers.length}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 newsletter-layout">
        {/* Compose Newsletter Panel */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E8E8E8] rounded-2xl p-6 md:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold tracking-wide uppercase text-[#111111] mb-1">
              Compose Newsletter
            </h3>
            <p className="text-xs text-[#6B6B6B]">Send an HTML/rich-text email broadcast to all active subscribers</p>
          </div>

          <form onSubmit={handleSendNewsletter} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[10px] tracking-widest uppercase text-[#6B6B6B] font-bold">
                Email Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="AISCA Onboarding Updates & Competitions"
                required
                className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-xl px-4 py-3 text-sm text-[#111111] placeholder-[#A3A3A3] outline-none focus:border-[#D1D5DB] transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] tracking-widest uppercase text-[#6B6B6B] font-bold">
                HTML Content / Body
              </label>
              <textarea
                value={htmlContent}
                onChange={e => setHtmlContent(e.target.value)}
                placeholder="<h1>Hello from AISCA!</h1><p>We are excited to share...</p>"
                required
                rows={10}
                className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-xl p-4 text-sm text-[#111111] placeholder-[#A3A3A3] outline-none font-mono focus:border-[#D1D5DB] transition-all resize-y"
              />
            </div>

            {message && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl text-xs flex items-center gap-3">
                <CheckCircle size={16} />
                <span>{message}</span>
              </div>
            )}

            {errMessage && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-3">
                <AlertTriangle size={16} />
                <span>{errMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={sending || activeSubscribers.length === 0}
              className="w-full min-h-[48px] bg-white text-black font-semibold text-xs tracking-widest uppercase rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Send size={14} />
              <span>{sending ? 'Sending Broadcast...' : 'Send Broadcast Email'}</span>
            </button>
          </form>
        </div>

        {/* Subscribers Registry List */}
        <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-2xl p-6 flex flex-col h-[560px]">
          <div className="mb-4">
            <h3 className="text-base font-bold tracking-wide uppercase text-[#111111]">
              Subscribers Registry
            </h3>
            <p className="text-[10px] text-[#6B6B6B] mt-1 uppercase tracking-wider">
              Real-time subscription logs
            </p>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-[#6B6B6B]">
                Loading subscribers...
              </div>
            ) : subscribers.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#6B6B6B]">
                No active subscribers found.
              </div>
            ) : (
              subscribers.map((sub) => (
                <div 
                  key={sub.id} 
                  className="p-3.5 bg-white/[0.02] border border-[#E8E8E8] rounded-xl flex flex-col gap-1 transition-all hover:bg-white/[0.04]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111111] truncate max-w-[150px]">
                      {sub.name || 'Anonymous'}
                    </span>
                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      sub.active 
                        ? 'bg-green-500/10 border border-green-500/20 text-green-500' 
                        : 'bg-red-500/10 border border-red-500/20 text-red-500'
                    }`}>
                      {sub.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#6B6B6B] truncate">{sub.email}</span>
                  <span className="text-[8px] text-gray-600 mt-1">
                    Joined: {new Date(sub.subscribed_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
