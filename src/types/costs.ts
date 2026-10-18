export type CostCalcType = 'unit' | 'percent'

export type OperatingCost = {
  id: string
  organization_id: string
  expense_date: string
  description: string
  amount: number
  cost_type: 'fixed' | 'variable'
  category: string
  calc_type?: CostCalcType | null
  unit_price?: number | null
  percent?: number | null
  channel?: string | null
  created_at: string
  updated_at: string
}

export type CreateCostInput = {
  organization_id: string
  expense_date: string
  description: string
  amount: number
  cost_type: 'fixed' | 'variable'
  category: string
  calc_type?: CostCalcType | null
  unit_price?: number | null
  percent?: number | null
  channel?: string | null
}
