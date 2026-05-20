export type AdminRole = 'chairman' | 'deputy_chairman' | 'cfo' | 'marketing_manager' | 'co_secretary'

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
    contact: true
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
    contact: true
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
    contact: false
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
    contact: false
  },
  co_secretary: {
    dashboard: true,
    associates: true,
    schools: true,
    orders: false,
    finance: false,
    analytics: false,
    members: false,
    newsletter: false,
    contact: false
  }
}

export const canAccess = (role: AdminRole, section: string): boolean => {
  return ROLE_PERMISSIONS[role]?.[section as keyof typeof ROLE_PERMISSIONS[typeof role]] ?? false
}
