export type SaleChannel = 'counter' | 'ifood' | 'bysell' | 'other'

export type SaleSource = 'manual' | 'import'

export type MenuItemOption = {
  id: string
  name: string
  sale_price: number | null
  active: boolean
}

export type Sale = {
  id: string
  organization_id: string
  sale_date: string
  menu_item_id: string
  channel: SaleChannel
  quantity: number
  unit_price: number
  total_amount: number
  source: SaleSource
  created_at: string
  updated_at: string
  menu_item?: {
    name: string
  } | null
}

export type CreateSaleInput = {
  sale_date: string
  menu_item_id: string
  channel: SaleChannel
  quantity: number
  total_amount: number
  source: SaleSource
}