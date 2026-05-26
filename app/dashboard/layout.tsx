'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  ShoppingBag, 
  CircleDollarSign, 
  Mail, 
  MessageSquare, 
  BarChart3,
  Settings,
  LogOut, 
  Menu, 
  X 
} from 'lucide-react'
import { getUnreadContactMessagesCount } from './contact/actions'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<{ name: string; role: string; email: string } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/'
      } else {
        const userMetadata = session.user.user_metadata
        setProfile({
          name: userMetadata?.name || 'Admin Board',
          role: userMetadata?.role || 'board_member',
          email: session.user.email || ''
        })
        setLoading(false)
        
        // Fetch unread count
        const count = await getUnreadContactMessagesCount()
        setUnreadCount(count)
      }
    }
    checkSession()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#080808',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', letterSpacing: '0.1em' }}>
            LOADING...
          </p>
        </div>
      </div>
    )
  }

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Associates Registry', path: '/dashboard/associates', icon: Users },
    { name: 'Schools Registry', path: '/dashboard/schools', icon: GraduationCap },
    { name: 'Product Orders', path: '/dashboard/orders', icon: ShoppingBag },
    { name: 'Finance Ledger', path: '/dashboard/finance', icon: CircleDollarSign },
    { name: 'Newsletter Hub', path: '/dashboard/newsletter', icon: Mail },
    { name: 'Contact Messages', path: '/dashboard/contact', icon: MessageSquare, badge: unreadCount },
    { name: 'Site Analytics', path: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings }
  ]

  const formatRole = (role: string) => {
    return role
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  const sidebarContent = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0c0c0c',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      boxSizing: 'border-box'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <img
            src="/original-logo.png"
            alt="AISCA"
            style={{ width: '100%', maxWidth: '140px', height: 'auto', objectFit: 'contain', marginBottom: '8px', display: 'block' }}
          />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', letterSpacing: '0.15em', margin: 0, textTransform: 'uppercase' }}>
            Operations Panel
          </p>
        </div>
        {/* Mobile Close Button */}
        <button 
          onClick={() => setSidebarOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            padding: '4px',
            display: 'none' // hidden on desktop via CSS wrapper
          }}
          className="mobile-close-btn"
        >
          <X size={18} />
        </button>
      </div>

      {/* Admin Profile Details */}
      {profile && (
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.01)'
        }}>
          <h4 style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: '600', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.name}
          </h4>
          <span style={{
            display: 'inline-block',
            fontSize: '9px',
            fontWeight: '700',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#d4af37',
            background: 'rgba(212,175,55,0.08)',
            border: '1px solid rgba(212,175,55,0.2)',
            padding: '3px 8px',
            borderRadius: '4px'
          }}>
            {formatRole(profile.role)}
          </span>
        </div>
      )}

      {/* Navigation list */}
      <nav style={{
        flex: 1,
        padding: '24px 16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        {navItems.map(item => {
          const isActive = pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setSidebarOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '10px',
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
                background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: isActive ? '1px solid rgba(255,255,255,0.04)' : '1px solid transparent',
                fontSize: '13px',
                fontWeight: isActive ? '600' : '500',
                textDecoration: 'none',
                transition: 'all 0.15s ease'
              }}
              className="nav-link"
            >
              <Icon size={16} style={{ color: isActive ? '#d4af37' : 'inherit' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>{item.name}</span>
                {item.badge ? (
                  <span style={{
                    background: '#ff4d4d',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    marginLeft: '8px'
                  }}>
                    {item.badge}
                  </span>
                ) : null}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Logout Row */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid rgba(255,255,255,0.06)'
      }}>
        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,50,50,0.55)',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease'
          }}
          className="logout-btn"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080808', color: '#ffffff' }}>
      
      {/* 1. Global CSS Styles injected dynamically */}
      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .nav-link:hover {
          color: #ffffff !important;
          background: rgba(255,255,255,0.02) !important;
        }
        .logout-btn:hover {
          color: #ff4d4d !important;
          background: rgba(255,50,50,0.04) !important;
        }
        @media (max-width: 1023px) {
          .desktop-sidebar {
            display: none !important;
          }
          .mobile-close-btn {
            display: flex !important;
          }
        }
        @media (min-width: 1024px) {
          .mobile-header {
            display: none !important;
          }
        }
      `}</style>

      {/* 2. Desktop Sidebar */}
      <div 
        className="desktop-sidebar" 
        style={{
          width: '280px',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh'
        }}
      >
        {sidebarContent}
      </div>

      {/* 3. Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          display: 'flex'
        }}>
          {/* Overlay backdrop */}
          <div 
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)'
            }}
          />
          {/* Drawer panel */}
          <div style={{
            position: 'relative',
            width: '280px',
            height: '100%',
            zIndex: 1000,
            animation: 'slideIn 0.25s ease-out'
          }}>
            {sidebarContent}
          </div>
        </div>
      )}


      {/* 4. Main Layout Shell */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* Mobile Header Bar */}
        <header 
          className="mobile-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            background: '#0c0c0c',
            borderBottom: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <Menu size={22} />
            </button>
            <h2 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '800', letterSpacing: '0.05em', margin: 0 }}>
              AI$CA
            </h2>
          </div>
          {profile && (
            <span style={{
              fontSize: '8px',
              fontWeight: '700',
              color: '#d4af37',
              border: '1px solid rgba(212,175,55,0.2)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              {formatRole(profile.role)}
            </span>
          )}
        </header>

        {/* Content Body Container */}
        <main style={{
          flex: 1,
          padding: '40px 24px 80px',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            {children}
          </div>
        </main>
      </div>

    </div>
  )
}

