import { supabase } from './supabase'
import type { Recipe, RecipeItem, RecipeItemInput } from '../types/recipes'

export async function listRecipes(organizationId: string) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('active', true)
    .order('name')
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    yield_quantity: Number(row.yield_quantity),
  })) as Recipe[]
}

export async function listRecipeItems(organizationId: string) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data, error } = await supabase
    .from('recipe_items')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at')
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    quantity: Number(row.quantity),
    manual_conversion_quantity: row.manual_conversion_quantity == null ? null : Number(row.manual_conversion_quantity),
  })) as RecipeItem[]
}

export async function createRecipe(input: {
  organizationId: string
  name: string
  yieldQuantity: number
  yieldUnit: string
  notes?: string
  items: RecipeItemInput[]
}) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      organization_id: input.organizationId,
      name: input.name.trim(),
      yield_quantity: input.yieldQuantity,
      yield_unit: input.yieldUnit,
      notes: input.notes?.trim() || null,
    })
    .select('*')
    .single()
  if (recipeError) throw recipeError

  if (input.items.length) {
    const { error: itemError } = await supabase.from('recipe_items').insert(
      input.items.map((item) => ({
        organization_id: input.organizationId,
        recipe_id: recipe.id,
        ...item,
      })),
    )
    if (itemError) {
      await supabase.from('recipes').delete().eq('id', recipe.id)
      throw itemError
    }
  }
  return recipe as Recipe
}

export async function updateRecipe(input: {
  id: string
  organizationId: string
  name: string
  yieldQuantity: number
  yieldUnit: string
  notes?: string
  items: RecipeItemInput[]
}) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { error: recipeError } = await supabase
    .from('recipes')
    .update({
      name: input.name.trim(),
      yield_quantity: input.yieldQuantity,
      yield_unit: input.yieldUnit,
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
  if (recipeError) throw recipeError

  const { error: deleteError } = await supabase.from('recipe_items').delete().eq('recipe_id', input.id)
  if (deleteError) throw deleteError
  if (input.items.length) {
    const { error: itemError } = await supabase.from('recipe_items').insert(
      input.items.map((item) => ({
        organization_id: input.organizationId,
        recipe_id: input.id,
        ...item,
      })),
    )
    if (itemError) throw itemError
  }
}

export async function deleteRecipe(id: string) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw error
}
