'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Download, ChevronLeft, ChevronRight, ShoppingBag, FileText, User, MapPin, X } from 'lucide-react'
import { sendPaymentVerifiedTelegram } from './actions'

export default function OrdersPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [orderFilter, setOrderFilter] = useState('all')
  const [deliveryFilter, setDeliveryFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Action status trackers
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  // Selected order for drawer
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    try {
      setLoading(true)
      const { data: orders, error } = await supabase
        .from('product_orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error("Error fetching orders:", error.message)
        return
      }
      setData(orders || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePaymentStatus = async (id: string, payment_status: string) => {
    try {
      setUpdatingId(id)
      const { error } = await supabase
        .from('product_orders')
        .update({ payment_status })
        .eq('id', id)

      if (error) {
        alert(`Error updating payment status: ${error.message}`)
        return
      }

      // Live update
      setData(prev => prev.map(o => o.id === id ? { ...o, payment_status } : o))
      if (selectedOrder?.id === id) {
        setSelectedOrder((prev: any) => ({ ...prev, payment_status }))
      }

      // Send telegram notification if verified
      if (payment_status === 'verified') {
        const order = data.find(o => o.id === id)
        if (order) {
          await sendPaymentVerifiedTelegram(order.order_number, order.product_name, order.customer_name, order.total_amount)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleUpdateOrderStatus = async (id: string, order_status: string) => {
    try {
      setUpdatingId(id)
      const { error } = await supabase
        .from('product_orders')
        .update({ order_status })
        .eq('id', id)

      if (error) {
        alert(`Error updating order status: ${error.message}`)
        return
      }

      setData(prev => prev.map(o => o.id === id ? { ...o, order_status } : o))
      if (selectedOrder?.id === id) {
        setSelectedOrder((prev: any) => ({ ...prev, order_status }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingId(null)
    }
  }

  // Filter Logic
  const filteredData = data.filter(item => {
    const matchesSearch = 
      (item.order_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.customer_phone || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesPayment = paymentFilter === 'all' || item.payment_status === paymentFilter
    const matchesOrder = orderFilter === 'all' || item.order_status === orderFilter
    const matchesDelivery = deliveryFilter === 'all' || item.delivery_method === deliveryFilter
    const matchesProduct = productFilter === 'all' || item.product_name === productFilter

    return matchesSearch && matchesPayment && matchesOrder && matchesDelivery && matchesProduct
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

  // Unique products list for filter dropdown
  const uniqueProducts = Array.from(new Set(data.map(item => item.product_name))).filter(Boolean)

  // Export CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) return

    const headers = [
      'Order No', 'Product Name', 'Size', 'Qty', 'Unit Price', 
      'Delivery Method', 'Delivery Fee', 'Total Amount', 
      'Customer Name', 'Customer Phone', 'Customer Address', 
      'Payment Status', 'Order Status', 'Notes', 'Order Date'
    ]

    const csvRows = [
      headers.join(','),
      ...filteredData.map(item => [
        `"${item.order_number || ''}"`,
        `"${item.product_name || ''}"`,
        `"${item.size || 'N/A'}"`,
        item.quantity || 1,
        item.unit_price,
        item.delivery_method === 'delivery' ? 'Delivery' : 'Event Pickup',
        item.delivery_fee,
        item.total_amount,
        `"${item.customer_name || ''}"`,
        `"${item.customer_phone || ''}"`,
        `"${item.customer_address || ''}"`,
        item.payment_status.toUpperCase(),
        item.order_status.toUpperCase(),
        `"${item.notes || ''}"`,
        new Date(item.created_at).toLocaleDateString('en-LK')
      ].join(','))
    ]

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `aisca_orders_export_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

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
          <h1 className="text-2xl font-bold tracking-wider uppercase text-white">Merchandise Orders</h1>
          <p className="text-xs text-gray-500 tracking-wide uppercase mt-1">Review sales payments and fulfillment states</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={filteredData.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Download size={14} />
          <span>Export CSV ({filteredData.length})</span>
        </button>
      </div>

      {/* Dynamic Multi-Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Search */}
        <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Search Order No / Customer..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-11 pr-4 py-3 bg-[#0b0b0b] border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all"
          />
        </div>

        {/* Product Filter */}
        <select
          value={productFilter}
          onChange={e => { setProductFilter(e.target.value); setCurrentPage(1); }}
          className="w-full px-4 py-3 bg-[#0b0b0b] border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-white/20 transition-all cursor-pointer"
        >
          <option value="all">All Products</option>
          {uniqueProducts.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* Delivery Method Filter */}
        <select
          value={deliveryFilter}
          onChange={e => { setDeliveryFilter(e.target.value); setCurrentPage(1); }}
          className="w-full px-4 py-3 bg-[#0b0b0b] border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-white/20 transition-all cursor-pointer"
        >
          <option value="all">All Delivery Methods</option>
          <option value="delivery">Home Delivery</option>
          <option value="event_pickup">Event Pickup</option>
        </select>

        {/* Payment Status Filter */}
        <select
          value={paymentFilter}
          onChange={e => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
          className="w-full px-4 py-3 bg-[#0b0b0b] border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-white/20 transition-all cursor-pointer"
        >
          <option value="all">All Payments</option>
          <option value="pending">Pending Verification</option>
          <option value="verified">Payment Verified</option>
          <option value="rejected">Payment Rejected</option>
        </select>

        {/* Order Status Filter */}
        <select
          value={orderFilter}
          onChange={e => { setOrderFilter(e.target.value); setCurrentPage(1); }}
          className="w-full px-4 py-3 bg-[#0b0b0b] border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-white/20 transition-all cursor-pointer"
        >
          <option value="all">All Shipping States</option>
          <option value="pending">Pending Logistics</option>
          <option value="processing">Processing Pack</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-white">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01] text-gray-500 uppercase tracking-widest text-[9px]">
                <th className="p-4 font-semibold">Order No</th>
                <th className="p-4 font-semibold">Product Catalog</th>
                <th className="p-4 font-semibold">Financials</th>
                <th className="p-4 font-semibold">Logistics Details</th>
                <th className="p-4 font-semibold text-center">Payment Status</th>
                <th className="p-4 font-semibold text-center">Fulfillment Status</th>
                <th className="p-4 font-semibold">Date Ordered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 uppercase tracking-widest text-[10px]">
                    No merchandise orders found matching filters.
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => {
                  const isUpdating = updatingId === item.id
                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedOrder(item)}
                      className="hover:bg-white/[0.01] transition-all cursor-pointer"
                    >
                      {/* Order Number */}
                      <td className="p-4 font-mono font-bold text-[#d4af37]">
                        {item.order_number}
                      </td>

                      {/* Product details */}
                      <td className="p-4 font-semibold">
                        <div className="flex items-center gap-2">
                          <ShoppingBag size={12} className="text-gray-500" />
                          <span>{item.product_name}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                          Size: {item.size || 'N/A'} | Qty: {item.quantity || 1}
                        </div>
                      </td>

                      {/* Financials */}
                      <td className="p-4">
                        <span className="font-semibold text-white">LKR {Number(item.total_amount).toLocaleString()}</span>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          Unit: LKR {Number(item.unit_price).toLocaleString()} | Deliv: LKR {Number(item.delivery_fee).toLocaleString()}
                        </div>
                      </td>

                      {/* Logistics */}
                      <td className="p-4">
                        <span className="font-semibold text-gray-300">{item.customer_name}</span>
                        <div className="text-[10px] text-gray-500 mt-0.5">Phone: {item.customer_phone}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5 max-w-[200px] truncate" title={item.customer_address}>
                          Method: {item.delivery_method === 'delivery' ? `Delivery (${item.customer_address})` : 'Event Pickup'}
                        </div>
                      </td>

                      {/* Payment Status Dropdown */}
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {isUpdating ? (
                          <div className="w-4 h-4 border-2 border-t-transparent border-[#d4af37] rounded-full animate-spin mx-auto"></div>
                        ) : (
                          <select
                            value={item.payment_status}
                            onChange={e => handleUpdatePaymentStatus(item.id, e.target.value)}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wide uppercase border bg-transparent cursor-pointer focus:outline-none ${
                              item.payment_status === 'verified' 
                                ? 'border-green-500/30 text-green-400' 
                                : item.payment_status === 'rejected'
                                ? 'border-red-500/30 text-red-400'
                                : 'border-amber-500/30 text-amber-400'
                            }`}
                          >
                            <option value="pending" className="bg-[#0b0b0b] text-amber-400 font-bold">Pending</option>
                            <option value="verified" className="bg-[#0b0b0b] text-green-400 font-bold">Verified</option>
                            <option value="rejected" className="bg-[#0b0b0b] text-red-400 font-bold">Rejected</option>
                          </select>
                        )}
                      </td>

                      {/* Fulfillment Status Dropdown */}
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {isUpdating ? (
                          <div className="w-4 h-4 border-2 border-t-transparent border-[#d4af37] rounded-full animate-spin mx-auto"></div>
                        ) : (
                          <select
                            value={item.order_status}
                            onChange={e => handleUpdateOrderStatus(item.id, e.target.value)}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wide uppercase border bg-transparent cursor-pointer focus:outline-none ${
                              item.order_status === 'delivered' 
                                ? 'border-green-500/30 text-green-400' 
                                : item.order_status === 'cancelled'
                                ? 'border-red-500/30 text-red-400'
                                : item.order_status === 'shipped'
                                ? 'border-blue-500/30 text-blue-400'
                                : 'border-amber-500/30 text-amber-400'
                            }`}
                          >
                            <option value="pending" className="bg-[#0b0b0b] text-amber-400 font-bold">Pending</option>
                            <option value="processing" className="bg-[#0b0b0b] text-cyan-400 font-bold">Processing</option>
                            <option value="shipped" className="bg-[#0b0b0b] text-blue-400 font-bold">Shipped</option>
                            <option value="delivered" className="bg-[#0b0b0b] text-green-400 font-bold">Delivered</option>
                            <option value="cancelled" className="bg-[#0b0b0b] text-red-400 font-bold">Cancelled</option>
                          </select>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="p-4 text-gray-400">
                        {new Date(item.created_at).toLocaleDateString('en-LK')}
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

      {/* Selected Order Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div
            onClick={() => setSelectedOrder(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          />
          <div className="relative w-full max-w-lg h-full bg-[#0b0b0b] border-l border-white/5 p-8 flex flex-col justify-between overflow-y-auto z-10">
            <div className="space-y-8">
              <div className="flex items-center justify-between pb-6 border-b border-white/5">
                <div className="flex items-center gap-3 text-[#d4af37]">
                  <ShoppingBag size={20} />
                  <span className="text-xs font-extrabold uppercase tracking-widest">Order Details</span>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-500 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <span className="block text-[9px] font-bold tracking-widest text-gray-500 uppercase">Order Number</span>
                  <div className="text-xl font-bold text-[#d4af37] mt-1">{selectedOrder.order_number}</div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold tracking-widest text-gray-500 uppercase">Product Information</span>
                  <div className="flex flex-col gap-1 text-xs text-white bg-white/[0.02] border border-white/5 px-4 py-3 rounded-xl">
                    <span className="font-semibold">{selectedOrder.product_name}</span>
                    <span className="text-gray-400">Size: {selectedOrder.size || 'N/A'} | Qty: {selectedOrder.quantity || 1}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold tracking-widest text-gray-500 uppercase">Customer Details</span>
                  <div className="flex flex-col gap-2 text-xs text-white bg-white/[0.02] border border-white/5 px-4 py-3 rounded-xl">
                    <div className="flex items-center gap-2"><User size={14} className="text-gray-400"/> {selectedOrder.customer_name}</div>
                    <div className="flex items-center gap-2 text-gray-400 font-mono">WhatsApp: {selectedOrder.customer_phone}</div>
                    <div className="flex gap-2 text-gray-400"><MapPin size={14} className="mt-0.5 shrink-0"/> {selectedOrder.customer_address}</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold tracking-widest text-gray-500 uppercase">Financials</span>
                  <div className="flex flex-col gap-1 text-xs text-white bg-white/[0.02] border border-white/5 px-4 py-3 rounded-xl">
                    <div className="flex justify-between border-b border-white/10 pb-2 mb-2">
                      <span className="text-gray-400">Unit Price</span>
                      <span>LKR {Number(selectedOrder.unit_price).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-2 mb-2">
                      <span className="text-gray-400">Delivery Fee</span>
                      <span>LKR {Number(selectedOrder.delivery_fee).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[#d4af37]">
                      <span>Total Amount</span>
                      <span>LKR {Number(selectedOrder.total_amount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-2">
                    <FileText size={12}/> Notes
                  </span>
                  <div className="text-xs text-white/80 bg-white/[0.02] border border-white/5 px-4 py-4 rounded-xl leading-relaxed whitespace-pre-wrap font-light">
                    {selectedOrder.notes || 'No special notes provided for this order.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
