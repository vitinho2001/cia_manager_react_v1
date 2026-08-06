export type MenuItem = {
  id: string
  organization_id: string
  name: string
  category: string
  active: boolean
  counter_price: number | null
  ifood_price: number | null
  bysell_price: number | null
  created_at: string
  updated_at: string
}

export type MenuComponentType = 'recipe' | 'ingredient'

export type MenuItemComponent = {
  id: string
  organization_id: string
  menu_item_id: string
  component_type: MenuComponentType
  recipe_id: string | null
  ingredient_id: string | null
  quantity: number
  unit: string | null
  created_at: string
}

export type MenuComponentInput = {
  component_type: MenuComponentType
  recipe_id: string | null
  ingredient_id: string | null
  quantity: number
  unit: string | null
}
