export type AdminRole = 'chairman' | 'deputy_chairman' | 'cfo' | 'marketing_manager' | 'co_secretary' | 'administration_manager' | 'rangeela_oc' | 'rangeela_cash'

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
    ideanet: true,
    rangeela: true
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
    ideanet: true,
    rangeela: false
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
    ideanet: false,
    rangeela: true
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
    ideanet: true,
    rangeela: false
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
    ideanet: false,
    rangeela: false
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
    ideanet: false,
    rangeela: false
  },
  // RANGEELA '26 organising committee: approve receipts + scan at the gate
  rangeela_oc: {
    dashboard: false, associates: false, schools: false, orders: false, finance: false,
    analytics: false, members: false, newsletter: false, contact: false, ideanet: false,
    rangeela: true
  },
  // RANGEELA '26 cash desk: cash sales + approvals + scanning
  rangeela_cash: {
    dashboard: false, associates: false, schools: false, orders: false, finance: false,
    analytics: false, members: false, newsletter: false, contact: false, ideanet: false,
    rangeela: true
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
