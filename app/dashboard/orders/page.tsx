'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Download, ChevronLeft, ChevronRight, ShoppingBag, FileText, User, MapPin, X, Wallet, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'

const OPENING_BALANCE = 5000 // merchandise bank opening balance (Rs.)

interface Item { product_id: string; name: string; size: string | null; quantity: number; unit_price: number; line_total: number }
interface Order {
  id: string; order_number: string
  customer_name: string; customer_email: string | null; school_name: string | null
  customer_phone: string; delivery_contact: string | null; customer_address: string
  items: Item[]; items_total: number; delivery_fee: number; total_amount: number
  receipt_url: string | null; receipt_filename: string | null; notes: string | null
  payment_status: 'pending' | 'verified' | 'rejected'
  order_status: string
  ledger_posted: boolean; ledger_entry_id: number | null
  created_at: string
}

const itemsSummary = (items: Item[] = []) =>
  items.map(i => `${i.name}${i.size ? ` (${i.size})` : ''} ×${i.quantity}`).join(', ')

const isPdf = (url?: string | null) => !!url && url.toLowerCase().split('?')[0].endsWith('.pdf')

export default function OrdersPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [orderFilter, setOrderFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Order | null>(null)

  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
    try {
      setLoading(true)
      const { data: orders, error } = await supabase
        .from('merch_orders')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) { console.error('Error fetching merch orders:', error.message); return }
      setData((orders || []) as Order[])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  // Merchandise bank: opening + verified sales
  const verifiedTotal = useMemo(() => data.filter(o => o.payment_status === 'verified').reduce((s, o) => s + Number(o.total_amount), 0), [data])
  const pendingCount = useMemo(() => data.filter(o => o.payment_status === 'pending').length, [data])
  const bankBalance = OPENING_BALANCE + verifiedTotal

  // Approve = verify payment + post income to the finance ledger (once)
  async function approve(order: Order) {
    if (updatingId) return
    setUpdatingId(order.id)
    try {
      let ledgerId = order.ledger_entry_id
      if (!order.ledger_posted) {
        const { data: led, error: e1 } = await supabase.from('finance_ledger').insert([{
          type: 'income',
          category: 'Product Sales',
          description: `Merchandise order ${order.order_number} — ${order.customer_name}`,
          amount: Number(order.total_amount),
          date: new Date().toISOString().slice(0, 10),
          cash_or_bank: 'bank',
          fund: 'Merchandise Fund',
          event_project: null,
          recorded_by: null,
          bill_url: order.receipt_url || null,
          bill_filename: order.receipt_filename || null,
        }]).select().single()
        if (e1) { alert(`Could not post to finance ledger: ${e1.message}`); return }
        ledgerId = led.id
      }
      const { error: e2 } = await supabase.from('merch_orders')
        .update({ payment_status: 'verified', ledger_posted: true, ledger_entry_id: ledgerId })
        .eq('id', order.id)
      if (e2) { alert(`Could not update order: ${e2.message}`); return }

      const patch = { payment_status: 'verified' as const, ledger_posted: true, ledger_entry_id: ledgerId! }
      setData(prev => prev.map(o => o.id === order.id ? { ...o, ...patch } : o))
      setSelected(s => s && s.id === order.id ? { ...s, ...patch } : s)
    } finally { setUpdatingId(null) }
  }

  async function setPayment(order: Order, payment_status: 'pending' | 'rejected') {
    if (updatingId) return
    setUpdatingId(order.id)
    try {
      const { error } = await supabase.from('merch_orders').update({ payment_status }).eq('id', order.id)
      if (error) { alert(error.message); return }
      setData(prev => prev.map(o => o.id === order.id ? { ...o, payment_status } : o))
      setSelected(s => s && s.id === order.id ? { ...s, payment_status } : s)
    } finally { setUpdatingId(null) }
  }

  async function setFulfillment(order: Order, order_status: string) {
    if (updatingId) return
    setUpdatingId(order.id)
    try {
      const { error } = await supabase.from('merch_orders').update({ order_status }).eq('id', order.id)
      if (error) { alert(error.message); return }
      setData(prev => prev.map(o => o.id === order.id ? { ...o, order_status } : o))
      setSelected(s => s && s.id === order.id ? { ...s, order_status } : s)
    } finally { setUpdatingId(null) }
  }

  const filtered = data.filter(o => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = (o.order_number || '').toLowerCase().includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.customer_phone || '').toLowerCase().includes(q) ||
      (o.school_name || '').toLowerCase().includes(q)
    const matchesPayment = paymentFilter === 'all' || o.payment_status === paymentFilter
    const matchesOrder = orderFilter === 'all' || o.order_status === orderFilter
    return matchesSearch && matchesPayment && matchesOrder
  })

  const indexOfLast = currentPage * itemsPerPage
  const currentItems = filtered.slice(indexOfLast - itemsPerPage, indexOfLast)
  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  function exportCSV() {
    if (filtered.length === 0) return
    const headers = ['Order No', 'Items', 'Items Total', 'Delivery', 'Total', 'Customer', 'School', 'Phone', 'Address', 'Payment', 'Fulfillment', 'Receipt', 'Date']
    const rows = [headers.join(','), ...filtered.map(o => [
      `"${o.order_number}"`, `"${itemsSummary(o.items)}"`, o.items_total, o.delivery_fee, o.total_amount,
      `"${o.customer_name}"`, `"${o.school_name || ''}"`, `"${o.customer_phone}"`, `"${(o.customer_address || '').replace(/"/g, "'")}"`,
      o.payment_status, o.order_status, `"${o.receipt_url || ''}"`, new Date(o.created_at).toLocaleDateString('en-LK'),
    ].join(','))]
    const uri = encodeURI('data:text/csv;charset=utf-8,' + rows.join('\n'))
    const link = document.createElement('a')
    link.href = uri; link.download = `aisca_merch_orders_${Date.now()}.csv`
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  const payBadge = (s: string) => s === 'verified' ? 'border-green-500/30 text-green-600 bg-green-50'
    : s === 'rejected' ? 'border-red-500/30 text-red-600 bg-red-50' : 'border-amber-500/30 text-amber-600 bg-amber-50'

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-t-2 border-r-2 border-[#d4af37] rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wider uppercase text-[#111111]">Merchandise Orders</h1>
          <p className="text-xs text-[#6B6B6B] tracking-wide uppercase mt-1">Verify payments, view receipts, and track fulfillment</p>
        </div>
        <button onClick={exportCSV} disabled={filtered.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F5F5F5] border border-[#E8E8E8] rounded-xl text-xs font-semibold uppercase tracking-wider text-[#111111] hover:bg-[#E8E8E8] disabled:opacity-40 transition-all">
          <Download size={14} /><span>Export CSV ({filtered.length})</span>
        </button>
      </div>

      {/* Merchandise Bank + stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="sm:col-span-2 rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #111111, #333)' }}>
          <div className="flex items-center gap-2 text-[#d4af37] text-[10px] font-bold uppercase tracking-widest"><Wallet size={14} /> Merchandise Bank</div>
          <div className="text-3xl font-bold mt-2">LKR {bankBalance.toLocaleString()}</div>
          <div className="text-[11px] text-white/50 mt-1">Opening LKR {OPENING_BALANCE.toLocaleString()} + verified sales LKR {verifiedTotal.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl p-5 bg-white border border-[#E8E8E8]">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">Total Orders</div>
          <div className="text-3xl font-bold text-[#111] mt-2">{data.length}</div>
        </div>
        <div className="rounded-2xl p-5 bg-white border border-[#E8E8E8]">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">Pending Verify</div>
          <div className="text-3xl font-bold text-amber-500 mt-2">{pendingCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6B6B]" size={16} />
          <input type="text" placeholder="Search order / name / school / phone…" value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#E8E8E8] rounded-xl text-xs text-[#111] placeholder-[#A3A3A3] focus:outline-none focus:border-[#D1D5DB]" />
        </div>
        <select value={paymentFilter} onChange={e => { setPaymentFilter(e.target.value); setCurrentPage(1) }}
          className="w-full px-4 py-3 bg-white border border-[#E8E8E8] rounded-xl text-xs text-[#111] focus:outline-none cursor-pointer">
          <option value="all">All Payments</option>
          <option value="pending">Pending Verification</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={orderFilter} onChange={e => { setOrderFilter(e.target.value); setCurrentPage(1) }}
          className="w-full px-4 py-3 bg-white border border-[#E8E8E8] rounded-xl text-xs text-[#111] focus:outline-none cursor-pointer">
          <option value="all">All Fulfillment</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-[#111]">
            <thead>
              <tr className="border-b border-[#E8E8E8] bg-[#FAFAFA] text-[#6B6B6B] uppercase tracking-widest text-[9px]">
                <th className="p-4 font-semibold">Order No</th>
                <th className="p-4 font-semibold">Items</th>
                <th className="p-4 font-semibold">Total</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold text-center">Receipt</th>
                <th className="p-4 font-semibold text-center">Payment</th>
                <th className="p-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E8]">
              {currentItems.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-[#6B6B6B] uppercase tracking-widest text-[10px]">No merchandise orders found.</td></tr>
              ) : currentItems.map(o => (
                <tr key={o.id} onClick={() => setSelected(o)} className="hover:bg-[#FAFAFA] transition-all cursor-pointer">
                  <td className="p-4 font-mono font-bold text-[#d4af37]">{o.order_number}</td>
                  <td className="p-4 max-w-[240px]">
                    <div className="flex items-center gap-2"><ShoppingBag size={12} className="text-[#6B6B6B] shrink-0" /><span className="truncate">{itemsSummary(o.items)}</span></div>
                  </td>
                  <td className="p-4 font-semibold">LKR {Number(o.total_amount).toLocaleString()}</td>
                  <td className="p-4">
                    <span className="font-semibold">{o.customer_name}</span>
                    <div className="text-[10px] text-[#6B6B6B] mt-0.5">{o.customer_phone}{o.school_name ? ` · ${o.school_name}` : ''}</div>
                  </td>
                  <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                    {o.receipt_url ? (
                      <a href={o.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#d4af37] hover:underline"><ExternalLink size={13} /> View</a>
                    ) : <span className="text-[#A3A3A3]">—</span>}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border ${payBadge(o.payment_status)}`}>{o.payment_status}</span>
                  </td>
                  <td className="p-4 text-[#6B6B6B]">{new Date(o.created_at).toLocaleDateString('en-LK')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#E8E8E8] flex items-center justify-between gap-4">
            <span className="text-[10px] text-[#6B6B6B] uppercase tracking-widest">Page {currentPage} of {totalPages} ({filtered.length} total)</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 rounded-lg bg-[#F5F5F5] border border-[#E8E8E8] flex items-center justify-center disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 rounded-lg bg-[#F5F5F5] border border-[#E8E8E8] flex items-center justify-center disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div onClick={() => setSelected(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg h-full bg-white border-l border-[#E8E8E8] p-8 flex flex-col overflow-y-auto z-10">
            <div className="flex items-center justify-between pb-6 border-b border-[#E8E8E8]">
              <div className="flex items-center gap-3 text-[#d4af37]"><ShoppingBag size={20} /><span className="text-xs font-extrabold uppercase tracking-widest">Order Details</span></div>
              <button onClick={() => setSelected(null)} className="text-[#6B6B6B] hover:text-[#111]"><X size={18} /></button>
            </div>

            <div className="space-y-6 pt-6">
              <div>
                <span className="block text-[9px] font-bold tracking-widest text-[#6B6B6B] uppercase">Order Number</span>
                <div className="text-xl font-bold text-[#d4af37] mt-1">{selected.order_number}</div>
                <div className="text-[11px] text-[#6B6B6B] mt-1">{new Date(selected.created_at).toLocaleString('en-LK')}</div>
              </div>

              {/* Items */}
              <div className="space-y-1.5">
                <span className="block text-[9px] font-bold tracking-widest text-[#6B6B6B] uppercase">Items</span>
                <div className="border border-[#E8E8E8] rounded-xl divide-y divide-[#E8E8E8]">
                  {(selected.items || []).map((it, i) => (
                    <div key={i} className="flex justify-between px-4 py-2.5 text-xs">
                      <span className="text-[#111]">{it.name}{it.size ? ` · ${it.size}` : ''} <span className="text-[#6B6B6B]">×{it.quantity}</span></span>
                      <span className="font-semibold">LKR {Number(it.line_total).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-2 text-[11px] text-[#6B6B6B]"><span>Delivery</span><span>LKR {Number(selected.delivery_fee).toLocaleString()}</span></div>
                  <div className="flex justify-between px-4 py-2.5 text-sm font-bold text-[#d4af37]"><span>Total</span><span>LKR {Number(selected.total_amount).toLocaleString()}</span></div>
                </div>
              </div>

              {/* Customer */}
              <div className="space-y-1.5">
                <span className="block text-[9px] font-bold tracking-widest text-[#6B6B6B] uppercase">Customer</span>
                <div className="flex flex-col gap-2 text-xs text-[#111] border border-[#E8E8E8] px-4 py-3 rounded-xl">
                  <div className="flex items-center gap-2"><User size={14} className="text-[#6B6B6B]" /> {selected.customer_name}{selected.school_name ? ` — ${selected.school_name}` : ''}</div>
                  <div className="text-[#6B6B6B] font-mono">WhatsApp: {selected.customer_phone}{selected.delivery_contact ? ` · Delivery: ${selected.delivery_contact}` : ''}</div>
                  {selected.customer_email && <div className="text-[#6B6B6B]">{selected.customer_email}</div>}
                  <div className="flex gap-2 text-[#6B6B6B]"><MapPin size={14} className="mt-0.5 shrink-0" /> {selected.customer_address}</div>
                </div>
              </div>

              {/* Receipt */}
              <div className="space-y-1.5">
                <span className="block text-[9px] font-bold tracking-widest text-[#6B6B6B] uppercase">Payment Receipt</span>
                {selected.receipt_url ? (
                  isPdf(selected.receipt_url) ? (
                    <a href={selected.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-3 border border-[#E8E8E8] rounded-xl text-xs text-[#d4af37] hover:bg-[#FAFAFA]"><FileText size={14} /> Open receipt PDF <ExternalLink size={12} /></a>
                  ) : (
                    <a href={selected.receipt_url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={selected.receipt_url} alt="Receipt" className="w-full rounded-xl border border-[#E8E8E8]" />
                    </a>
                  )
                ) : <p className="text-xs text-[#6B6B6B]">No receipt uploaded.</p>}
              </div>

              {selected.notes && (
                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold tracking-widest text-[#6B6B6B] uppercase flex items-center gap-2"><FileText size={12} /> Notes</span>
                  <div className="text-xs text-[#111]/80 border border-[#E8E8E8] px-4 py-3 rounded-xl whitespace-pre-wrap">{selected.notes}</div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <span className="block text-[9px] font-bold tracking-widest text-[#6B6B6B] uppercase">Payment Verification</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border ${payBadge(selected.payment_status)}`}>{selected.payment_status}</span>
                  {selected.ledger_posted && <span className="text-[10px] text-green-600">✓ Added to bank</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(selected)} disabled={updatingId === selected.id || selected.payment_status === 'verified'}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide bg-green-600 text-white hover:bg-green-700 disabled:opacity-40">
                    <CheckCircle2 size={14} /> {selected.payment_status === 'verified' ? 'Verified' : 'Approve & add to bank'}
                  </button>
                  <button onClick={() => setPayment(selected, 'rejected')} disabled={updatingId === selected.id || selected.payment_status === 'rejected'}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide bg-[#F5F5F5] border border-[#E8E8E8] text-red-600 hover:bg-red-50 disabled:opacity-40">
                    <XCircle size={14} /> Reject
                  </button>
                </div>

                <span className="block text-[9px] font-bold tracking-widest text-[#6B6B6B] uppercase pt-2">Fulfillment Status</span>
                <select value={selected.order_status} onChange={e => setFulfillment(selected, e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-[#E8E8E8] rounded-xl text-xs text-[#111] focus:outline-none cursor-pointer">
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
