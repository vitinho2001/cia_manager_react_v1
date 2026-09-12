import { supabase } from './supabase'
import type { Ingredient } from '../types/ingredients'
import type { IngredientPurchase } from '../types/ingredients'
import type { MenuItemComponent } from '../types/menu'
import type { RecipeItem } from '../types/recipes'
import type { Sale } from '../types/sales'
import type { StockAdjustment, StockAdjustmentInput, StockLine } from '../types/stock'

export async function listStockAdjustments(organizationId: string) {
  if (!supabase) throw new Error('Supabase nao configurado.')
  const { data, error } = await supabase.from('stock_adjustments').select('*').eq('organization_id', organizationId).order('adjustment_date', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({ ...r, quantity: Number(r.quantity) })) as StockAdjustment[]
}

export async function createStockAdjustment(input: StockAdjustmentInput) {
  if (!supabase) throw new Error('Supabase nao configurado.')
  const { error } = await supabase.from('stock_adjustments').insert(input)
  if (error) throw error
}

export async function deleteStockAdjustment(id: string) {
  if (!supabase) throw new Error('Supabase nao configurado.')
  const { error } = await supabase.from('stock_adjustments').delete().eq('id', id)
  if (error) throw error
}

export function computeStock(
  ingredients: Ingredient[],
  purchases: IngredientPurchase[],
  menuComponents: MenuItemComponent[],
  recipeItems: RecipeItem[],
  sales: Sale[],
  adjustments: StockAdjustment[],
): StockLine[] {
  const perUnit: Record<string, Record<string, number>> = {}
  for (const c of menuComponents) {
    if (!perUnit[c.menu_item_id]) perUnit[c.menu_item_id] = {}
    if (c.component_type === 'ingredient' && c.ingredient_id) {
      perUnit[c.menu_item_id][c.ingredient_id] = (perUnit[c.menu_item_id][c.ingredient_id] ?? 0) + (c.quantity || 0)
    } else if (c.component_type === 'recipe' && c.recipe_id) {
      for (const ri of recipeItems) {
        if (ri.recipe_id === c.recipe_id && ri.ingredient_id) {
          perUnit[c.menu_item_id][ri.ingredient_id] = (perUnit[c.menu_item_id][ri.ingredient_id] ?? 0) + (c.quantity || 0) * (ri.quantity || 0)
        }
      }
    }
  }
  const referenced = new Set<string>()
  for (const map of Object.values(perUnit)) for (const id of Object.keys(map)) referenced.add(id)

  const consumed: Record<string, number> = {}
  for (const s of sales) {
    const map = perUnit[s.menu_item_id]
    if (!map) continue
    for (const [ingId, amt] of Object.entries(map)) consumed[ingId] = (consumed[ingId] ?? 0) + (s.quantity || 0) * amt
  }

  const purchased: Record<string, number> = {}
  for (const p of purchases) purchased[p.ingredient_id] = (purchased[p.ingredient_id] ?? 0) + (p.quantity || 0)

  const adjusted: Record<string, number> = {}
  for (const a of adjustments) {
    const sign = a.adjustment_type === 'surplus' ? 1 : -1
    adjusted[a.ingredient_id] = (adjusted[a.ingredient_id] ?? 0) + sign * (a.quantity || 0)
  }

  const avgCost: Record<string, number> = {}
  const byIng: Record<string, IngredientPurchase[]> = {}
  for (const p of purchases) { (byIng[p.ingredient_id] ??= []).push(p) }
  for (const [id, list] of Object.entries(byIng)) {
    const sorted = [...list].sort((a, b) => a.purchase_date.localeCompare(b.purchase_date))
    let qty = 0, avg = 0
    for (const p of sorted) {
      const unitCost = p.total_amount / (p.quantity || 1)
      if (qty <= 0) { qty = p.quantity; avg = unitCost }
      else { avg = (avg * qty + p.quantity * unitCost) / (qty + p.quantity); qty += p.quantity }
    }
    avgCost[id] = avg
  }

  return ingredients.map((ing) => {
    const purchasedQty = purchased[ing.id] ?? 0
    const consumedQty = consumed[ing.id] ?? 0
    const adjustedQty = adjusted[ing.id] ?? 0
    const balance = purchasedQty - consumedQty + adjustedQty
    const avg = avgCost[ing.id] ?? 0
    return {
      ingredientId: ing.id,
      name: ing.name,
      category: ing.category,
      unit: ing.purchase_unit,
      purchased: purchasedQty,
      consumed: consumedQty,
      adjusted: adjustedQty,
      balance,
      avgCost: avg,
      value: balance * avg,
      hasRecipe: referenced.has(ing.id),
    }
  })
}
