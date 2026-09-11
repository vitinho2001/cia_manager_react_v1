import { supabase } from './supabase'
import type { BusinessSettings } from '../types/settings'

function normalizeSettings(row: Record<string, unknown>): BusinessSettings {
  return {
    ...(row as BusinessSettings),
    target_net_margin: Number(row.target_net_margin) || 0,
    ifood_fee: Number(row.ifood_fee) || 0,
    bysell_fee: Number(row.bysell_fee) || 0,
    counter_fee: Number(row.counter_fee) || 0,
    monthly_sales_estimate: Number(row.monthly_sales_estimate) || 0,
  }
}

export async function listBusinessSettings(organizationId: string): Promise<BusinessSettings> {
  if (!supabase) throw new Error('Supabase nao configurado.')
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    const { data: created, error: createError } = await supabase
      .from('business_settings')
      .insert({ organization_id: organizationId })
      .select('*')
      .single()
    if (createError) throw createError
    return normalizeSettings(created as Record<string, unknown>)
  }
  return normalizeSettings(data as Record<string, unknown>)
}

export async function updateBusinessSettings(
  organizationId: string,
  patch: Partial<Pick<BusinessSettings, 'target_net_margin' | 'ifood_fee' | 'bysell_fee' | 'counter_fee'>>
) {
  if (!supabase) throw new Error('Supabase nao configurado.')
  const { data, error } = await supabase
    .from('business_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .select('*')
    .single()
  if (error) throw error
  return normalizeSettings(data as Record<string, unknown>)
}