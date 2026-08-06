import { supabase } from './supabase'
import type { Ingredient, IngredientPurchase } from '../types/ingredients'

export type NewIngredientWithPurchase = {
  organizationId: string
  name: string
  category: string
  purchaseUnit: string
  purchaseDate: string
  quantity: number
  totalAmount: number
  supplier?: string
}

export async function listIngredients(organizationId: string) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('active', true)
    .order('name')
  if (error) throw error
  return (data ?? []) as Ingredient[]
}

export async function listPurchases(organizationId: string, startDate?: string, endDate?: string) {
  if (!supabase) throw new Error('Supabase não configurado.')
  let query = supabase
    .from('ingredient_purchases')
    .select('*')
    .eq('organization_id', organizationId)
    .order('purchase_date', { ascending: false })
  if (startDate) query = query.gte('purchase_date', startDate)
  if (endDate) query = query.lte('purchase_date', endDate)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({ ...row, quantity: Number(row.quantity), total_amount: Number(row.total_amount) })) as IngredientPurchase[]
}

export async function createIngredientWithPurchase(input: NewIngredientWithPurchase) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data: ingredient, error: ingredientError } = await supabase
    .from('ingredients')
    .insert({
      organization_id: input.organizationId,
      name: input.name.trim(),
      category: input.category || null,
      purchase_unit: input.purchaseUnit,
    })
    .select('*')
    .single()
  if (ingredientError) throw ingredientError
  const { error: purchaseError } = await supabase.from('ingredient_purchases').insert({
    organization_id: input.organizationId,
    ingredient_id: ingredient.id,
    purchase_date: input.purchaseDate,
    quantity: input.quantity,
    purchase_unit: input.purchaseUnit,
    total_amount: input.totalAmount,
    supplier: input.supplier?.trim() || null,
  })
  if (purchaseError) {
    await supabase.from('ingredients').delete().eq('id', ingredient.id)
    throw purchaseError
  }
  return ingredient as Ingredient
}

export async function addPurchase(purchase: Omit<IngredientPurchase, 'id' | 'created_at' | 'updated_at'>) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { error } = await supabase.from('ingredient_purchases').insert(purchase)
  if (error) throw error
}

export async function updatePurchase(id: string, changes: Pick<IngredientPurchase, 'purchase_date' | 'quantity' | 'purchase_unit' | 'total_amount' | 'supplier'>) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { error } = await supabase.from('ingredient_purchases').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deletePurchase(id: string) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { error } = await supabase.from('ingredient_purchases').delete().eq('id', id)
  if (error) throw error
}

export async function deleteIngredient(id: string) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { error } = await supabase.from('ingredients').delete().eq('id', id)
  if (error) throw error
}
