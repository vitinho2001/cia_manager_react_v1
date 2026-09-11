import { supabase } from './supabase'
import type { CreateSaleInput, Sale } from '../types/sales'

export async function listSales(organizationId: string, from?: string, to?: string) {
  if (!supabase) throw new Error('Supabase nao configurado.')
  let q = supabase.from('sales').select('*, menu_item:menu_items(name)').eq('organization_id', organizationId).order('sale_date', { ascending: false })
  if (from) q = q.gte('sale_date', from)
  if (to) q = q.lte('sale_date', to)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({ ...row, quantity: Number(row.quantity), unit_price: Number(row.unit_price), total_amount: Number(row.total_amount) })) as Sale[]
}

function withUnitPrice(input: CreateSaleInput) {
  const qty = input.quantity > 0 ? input.quantity : 1
  return { ...input, quantity: qty, unit_price: Number((input.total_amount / qty).toFixed(4)) }
}

export async function createSale(input: CreateSaleInput) {
  if (!supabase) throw new Error('Supabase nao configurado.')
  const { data, error } = await supabase.from('sales').insert(withUnitPrice(input)).select().single()
  if (error) throw error
  return data as Sale
}

export async function createSales(inputs: CreateSaleInput[]) {
  if (!supabase) throw new Error('Supabase nao configurado.')
  if (inputs.length === 0) return []
  const { data, error } = await supabase.from('sales').insert(inputs.map(withUnitPrice)).select()
  if (error) throw error
  return (data ?? []) as Sale[]
}

export async function deleteSale(id: string) {
  if (!supabase) throw new Error('Supabase nao configurado.')
  const { error } = await supabase.from('sales').delete().eq('id', id)
  if (error) throw error
}