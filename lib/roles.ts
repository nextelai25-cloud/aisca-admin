export type AdminRole = 'chairman' | 'deputy_chairman' | 'cfo' | 'marketing_manager' | 'co_secretary' | 'administration_manager'

export const ROLE_PERMISSIONS = {
  chairman: {
    dashboard: true,
    associates: true,
    schools: true,
    orders: true,
    finance: true,
    analytics: true,
    members: true,
    newsletter: true,
    contact: true,
    ideanet: true
  },
  deputy_chairman: {
    dashboard: true,
    associates: true,
    schools: true,
    orders: true,
    finance: false,
    analytics: true,
    members: false,
    newsletter: false,
    contact: true,
    ideanet: true
  },
  cfo: {
    dashboard: true,
    associates: false,
    schools: false,
    orders: true,
    finance: true,
    analytics: false,
    members: false,
    newsletter: false,
    contact: false,
    ideanet: false
  },
  marketing_manager: {
    dashboard: true,
    associates: true,
    schools: false,
    orders: false,
    finance: false,
    analytics: true,
    members: false,
    newsletter: true,
    contact: false,
    ideanet: true
  },
  co_secretary: {
    dashboard: true,
    associates: true,
    schools: true,
    orders: false,
    finance: true,
    analytics: false,
    members: false,
    newsletter: false,
    contact: false,
    ideanet: false
  },
  administration_manager: {
    dashboard: true,
    associates: true,
    schools: true,
    orders: false,
    finance: false,
    analytics: false,
    members: false,
    newsletter: false,
    contact: false,
    ideanet: false
  }
}

export const canAccess = (role: AdminRole, section: string): boolean => {
  return ROLE_PERMISSIONS[role]?.[section as keyof typeof ROLE_PERMISSIONS[typeof role]] ?? false
}

// Granular button-level UI visibility checks
export const canDelete = (role: AdminRole): boolean => {
  // Only Chairman has destructive deletion rights
  return role === 'chairman'
}

export const canAccessFinanceTab = (role: AdminRole, tab: string): boolean => {
  if (role === 'chairman' || role === 'cfo') return true
  // Co-secretary can view basic finance but not budgets/reconciliation
  if (role === 'co_secretary') {
    return ['dashboard', 'transactions', 'reports'].includes(tab)
  }
  return false
}

export const canExport = (role: AdminRole): boolean => {
  // Only high-level officers can export CSV/PDF reports
  return ['chairman', 'cfo', 'co_secretary'].includes(role)
}
