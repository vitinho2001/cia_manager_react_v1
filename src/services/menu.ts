import { supabase } from './supabase'
import type { MenuComponentInput, MenuItem, MenuItemComponent } from '../types/menu'

function numericMenu(row: Record<string, unknown>): MenuItem {
  return {
    ...row,
    counter_price: row.counter_price == null ? null : Number(row.counter_price),
    ifood_price: row.ifood_price == null ? null : Number(row.ifood_price),
    bysell_price: row.bysell_price == null ? null : Number(row.bysell_price),
  } as MenuItem
}

export async function listMenuItems(organizationId: string) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data, error } = await supabase.from('menu_items').select('*').eq('organization_id', organizationId).eq('active', true).order('category').order('name')
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => numericMenu(row))
}

export async function listMenuComponents(organizationId: string) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data, error } = await supabase.from('menu_item_components').select('*').eq('organization_id', organizationId).order('created_at')
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({ ...row, quantity: Number(row.quantity) })) as MenuItemComponent[]
}

export async function createMenuItem(input: { organizationId: string; name: string; category: string; counterPrice: number | null; ifoodPrice: number | null; bysellPrice: number | null; components: MenuComponentInput[] }) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data: item, error } = await supabase.from('menu_items').insert({
    organization_id: input.organizationId,
    name: input.name.trim(),
    category: input.category.trim(),
    counter_price: input.counterPrice,
    ifood_price: input.ifoodPrice,
    bysell_price: input.bysellPrice,
  }).select('*').single()
  if (error) throw error
  if (input.components.length) {
    const { error: componentError } = await supabase.from('menu_item_components').insert(input.components.map((component) => ({ organization_id: input.organizationId, menu_item_id: item.id, ...component })))
    if (componentError) {
      await supabase.from('menu_items').delete().eq('id', item.id)
      throw componentError
    }
  }
  return numericMenu(item as Record<string, unknown>)
}

export async function updateMenuItem(input: { id: string; organizationId: string; name: string; category: string; counterPrice: number | null; ifoodPrice: number | null; bysellPrice: number | null; components: MenuComponentInput[] }) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { error } = await supabase.from('menu_items').update({ name: input.name.trim(), category: input.category.trim(), counter_price: input.counterPrice, ifood_price: input.ifoodPrice, bysell_price: input.bysellPrice, updated_at: new Date().toISOString() }).eq('id', input.id)
  if (error) throw error
  const { error: deleteError } = await supabase.from('menu_item_components').delete().eq('menu_item_id', input.id)
  if (deleteError) throw deleteError
  if (input.components.length) {
    const { error: componentError } = await supabase.from('menu_item_components').insert(input.components.map((component) => ({ organization_id: input.organizationId, menu_item_id: input.id, ...component })))
    if (componentError) throw componentError
  }
}

export async function deleteMenuItem(id: string) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { error } = await supabase.from('menu_items').delete().eq('id', id)
  if (error) throw error
}

export async function seedMenuItems(organizationId: string, rows: { category: string; name: string }[]) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { error } = await supabase.from('menu_items').upsert(rows.map((row) => ({ organization_id: organizationId, category: row.category, name: row.name })), { onConflict: 'organization_id,name,category', ignoreDuplicates: true })
  if (error) throw error
}
