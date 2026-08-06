export type Recipe = {
  id: string
  organization_id: string
  name: string
  yield_quantity: number
  yield_unit: string
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export type RecipeItem = {
  id: string
  organization_id: string
  recipe_id: string
  ingredient_id: string
  quantity: number
  recipe_unit: string
  manual_conversion_quantity: number | null
  manual_conversion_unit: string | null
  created_at: string
}

export type RecipeItemInput = {
  ingredient_id: string
  quantity: number
  recipe_unit: string
  manual_conversion_quantity: number | null
  manual_conversion_unit: string | null
}
