'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Shield, Bell, Key, Users, Info, Save } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  chairman: 'Chairman',
  deputy_chairman: 'Deputy Chairman',
  cfo: 'Chief Financial Officer',
  marketing_manager: 'Marketing Manager',
  co_secretary: 'Co Secretary'
}

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordUpdating, setPasswordUpdating] = useState(false)

  const [adminUsers, setAdminUsers] = useState<any[]>([])

  useEffect(() => {
    async function fetchAdminUsers() {
      const { data, error } = await supabase
        .from('admin_users')
        .select('name, email, role')
        .order('role')
      if (!error && data) {
        setAdminUsers(data)
      }
    }
    fetchAdminUsers()
  }, [])

  const [emailNotifs, setEmailNotifs] = useState(true)
  const [telegramNotifs, setTelegramNotifs] = useState(true)

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) return

    try {
      setPasswordUpdating(true)
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        alert(`Failed to update password: ${error.message}`)
      } else {
        alert('Password updated successfully')
        setCurrentPassword('')
        setNewPassword('')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setPasswordUpdating(false)
    }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-large-title font-bold tracking-tight text-[#1D1D1F]">Platform Settings</h1>
        <p className="text-body text-[#6E6E73] mt-1">Configure admin dashboard preferences and security</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 settings-grid">
        {/* Security / Password */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] p-6 rounded-card shadow-card space-y-6">
          <div className="flex items-center gap-3 text-[#1D1D1F] border-b border-[#E5E5EA] pb-4">
            <Key size={18} className="text-[#8A6D1C]" />
            <h2 className="text-body font-bold ">Change Password</h2>
          </div>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-caption text-[#6E6E73] uppercase tracking-[0.04em] mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#FBFBFD] border border-[#E5E5EA] rounded-control text-body text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#6E6E73] transition"
                placeholder="Enter new strong password"
              />
            </div>
            <button
              type="submit"
              disabled={passwordUpdating || !newPassword}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#F5F5F7] border border-[#E5E5EA] hover:bg-[#E5E5EA] text-[#1D1D1F] rounded-control text-body font-semibold capitalize transition disabled:opacity-40"
            >
              <Shield size={14} />
              <span>{passwordUpdating ? 'Updating...' : 'Update Password'}</span>
            </button>
          </form>
        </div>

        {/* Notifications */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] p-6 rounded-card shadow-card space-y-6">
          <div className="flex items-center gap-3 text-[#1D1D1F] border-b border-[#E5E5EA] pb-4">
            <Bell size={18} className="text-[#8A6D1C]" />
            <h2 className="text-body font-bold ">Notification Preferences</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-[#E5E5EA] rounded-control">
              <div>
                <p className="text-body font-bold text-[#1D1D1F] ">Email Alerts</p>
                <p className="text-caption text-[#6E6E73] mt-1">Receive system alerts via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={emailNotifs} onChange={() => setEmailNotifs(!emailNotifs)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition peer-checked:bg-[#d4af37]"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-[#E5E5EA] rounded-control">
              <div>
                <p className="text-body font-bold text-[#1D1D1F] ">Telegram Bot Alerts</p>
                <p className="text-caption text-[#6E6E73] mt-1">Instant chat notifications for verified payments</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={telegramNotifs} onChange={() => setTelegramNotifs(!telegramNotifs)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition peer-checked:bg-[#d4af37]"></div>
              </label>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#d4af37] hover:bg-[#eac44e] text-black rounded-control text-body font-semibold capitalize transition w-full"
            >
              <Save size={14} />
              <span>Save Preferences</span>
            </button>
          </div>
        </div>

        {/* Platform Info */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] p-6 rounded-card shadow-card space-y-6">
          <div className="flex items-center gap-3 text-[#1D1D1F] border-b border-[#E5E5EA] pb-4">
            <Info size={18} className="text-[#8A6D1C]" />
            <h2 className="text-body font-bold ">Platform Information</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-body border-b border-[#E5E5EA] pb-2">
              <span className="text-[#6E6E73] uppercase tracking-[0.04em]">Version</span>
              <span className="font-mono text-[#1D1D1F]">v2.4.0 (Build 902)</span>
            </div>
            <div className="flex justify-between text-body border-b border-[#E5E5EA] pb-2">
              <span className="text-[#6E6E73] uppercase tracking-[0.04em]">Environment</span>
              <span className="font-mono text-green-400">Production</span>
            </div>
            <div className="flex justify-between text-body border-b border-[#E5E5EA] pb-2">
              <span className="text-[#6E6E73] uppercase tracking-[0.04em]">Database</span>
              <span className="font-mono text-[#1D1D1F]">Supabase PgSQL (Active)</span>
            </div>
            <div className="flex justify-between text-body">
              <span className="text-[#6E6E73] uppercase tracking-[0.04em]">Last Backup</span>
              <span className="font-mono text-[#1D1D1F]">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Admin Team */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] p-6 rounded-card shadow-card space-y-6">
          <div className="flex items-center gap-3 text-[#1D1D1F] border-b border-[#E5E5EA] pb-4">
            <Users size={18} className="text-[#8A6D1C]" />
            <h2 className="text-body font-bold ">Admin Directory</h2>
          </div>
          <div className="space-y-4">
            {adminUsers.map((admin, idx) => (
              <div key={idx} className="flex justify-between items-center bg-white/[0.02] p-3 rounded-control border border-[#E5E5EA]">
                <div>
                  <p className="text-body font-bold text-[#1D1D1F] capitalize ">{admin.name}</p>
                  <p className="text-caption text-[#6E6E73] font-mono mt-1">{admin.email}</p>
                </div>
                <span className="text-caption bg-[#E5E5EA] px-2 py-1 rounded-md text-[#1D1D1F] uppercase tracking-[0.04em] border border-[#E5E5EA]">
                  {ROLE_LABELS[admin.role] || admin.role.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
            {adminUsers.length === 0 && (
              <p className="text-body text-[#6E6E73] text-center">No board members found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
