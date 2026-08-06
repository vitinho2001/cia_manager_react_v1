export type Ingredient = {
  id: string
  organization_id: string
  name: string
  category: string | null
  purchase_unit: string
  active: boolean
  created_at: string
  updated_at: string
}

export type IngredientPurchase = {
  id: string
  organization_id: string
  ingredient_id: string
  purchase_date: string
  quantity: number
  purchase_unit: string
  total_amount: number
  supplier: string | null
  created_at: string
  updated_at: string
}
