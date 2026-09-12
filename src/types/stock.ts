export type StockAdjustmentType = 'loss' | 'waste' | 'surplus'
export type StockAdjustment = {
  id: string
  organization_id: string
  ingredient_id: string
  adjustment_date: string
  adjustment_type: StockAdjustmentType
  quantity: number
  unit: string
  reason: string | null
  created_at: string
}
export type StockAdjustmentInput = {
  organization_id: string
  ingredient_id: string
  adjustment_date: string
  adjustment_type: StockAdjustmentType
  quantity: number
  unit: string
  reason?: string
}
export type StockLine = {
  ingredientId: string
  name: string
  category: string | null
  unit: string
  purchased: number
  consumed: number
  adjusted: number
  balance: number
  avgCost: number
  value: number
  hasRecipe: boolean
}
