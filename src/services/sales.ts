import { supabase } from './supabase'
import type { CreateSaleInput, Sale } from '../types/sales'

export async function listSales(organizationId: string, from?: string, to?: string) {
  if (!supabase) throw new Error('Supabase nao configurado.')
  let q = supabase.from('sales').select('*, menu_item:menu_items(name)').eq('organization_id', organizationId).order('sale_date', { ascending: false })
  if (from) q = q.gte('sale_date', from)
  if (to) q = q.lte('sale_date', to)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    quantity: Number(row.quantity),
    unit_price: Number(row.unit_price),
    total_amount: Number(row.total_amount),
  })) as Sale[]
}

function withUnitPrice(input: CreateSaleInput) {
  const qty = input.quantity > 0 ? input.quantity : 1
  return { ...input, quantity: qty, unit_price: Number((input.total_amount / qty).toFixed(2)) }
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

export async function deleteSalesByDate(organizationId: string, saleDate: string) {
if (!supabase) throw new Error('Supabase nao configurado.')
const { error } = await supabase.from('sales').delete().eq('organization_id', organizationId).eq('sale_date', saleDate)
if (error) throw error
}
export async function deleteSale(id: string) {
  if (!supabase) throw new Error('Supabase nao configurado.')
  const { error } = await supabase.from('sales').delete().eq('id', id)
  if (error) throw error
}
export async function updateSale(
  id: string,
  patch: { menu_item_id?: string; channel?: string; quantity?: number; total_amount?: number }
) {
  if (!supabase) throw new Error('Supabase nao configurado.')
  const update: Record<string, unknown> = {}
  if (patch.menu_item_id !== undefined) update.menu_item_id = patch.menu_item_id
  if (patch.channel !== undefined) update.channel = patch.channel
  if (patch.quantity !== undefined) update.quantity = patch.quantity
  if (patch.total_amount !== undefined) update.total_amount = patch.total_amount
  const { data, error } = await supabase.from('sales').update(update).eq('id', id).select().single()
  if (error) throw error
  return data as Sale
} 
export async function updateSale(
  id: string,
  patch: { menu_item_id?: string; channel?: string; quantity?: number; total_amount?: number }
) {
  if (!supabase) throw new Error('Supabase nao configurado.')
  const update: Record<string, unknown> = {}
  if (patch.menu_item_id !== undefined) update.menu_item_id = patch.menu_item_id
  if (patch.channel !== undefined) update.channel = patch.channel
  if (patch.quantity !== undefined) update.quantity = patch.quantity
  if (patch.total_amount !== undefined) update.total_amount = patch.total_amount
  const { data, error } = await supabase.from('sales').update(update).eq('id', id).select().single()
  if (error) throw error
  return data as Sale
}