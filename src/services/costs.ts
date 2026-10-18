import { supabase } from './supabase'
import type { CreateCostInput, OperatingCost } from '../types/costs'

export async function listOperatingCosts(organizationId: string, from?: string, to?: string) {
if (!supabase) throw new Error('Supabase nao configurado.')
let q = supabase.from('operating_costs').select('*').eq('organization_id', organizationId).order('expense_date', { ascending: false })
if (from) q = q.gte('expense_date', from)
if (to) q = q.lte('expense_date', to)
const { data, error } = await q
if (error) throw error
return ((data ?? []) as Record<string, unknown>[]).map((row: Record<string, unknown>) => ({
...row,
amount: Number(row.amount),
unit_price: row.unit_price == null ? null : Number(row.unit_price),
percent: row.percent == null ? null : Number(row.percent),
})) as OperatingCost[]
}

export async function createOperatingCost(input: CreateCostInput) {
if (!supabase) throw new Error('Supabase nao configurado.')
const { error } = await supabase.from('operating_costs').insert(input)
if (error) throw error
}

export async function createOperatingCosts(inputs: CreateCostInput[]) {
if (!supabase) throw new Error('Supabase nao configurado.')
if (!inputs.length) return
const { error } = await supabase.from('operating_costs').insert(inputs)
if (error) throw error
}

export async function updateOperatingCost(id: string, patch: Partial<CreateCostInput>) {
if (!supabase) throw new Error('Supabase nao configurado.')
const update: Record<string, unknown> = {}
if (patch.expense_date !== undefined) update.expense_date = patch.expense_date
if (patch.description !== undefined) update.description = patch.description
if (patch.amount !== undefined) update.amount = patch.amount
if (patch.category !== undefined) update.category = patch.category
if (patch.calc_type !== undefined) update.calc_type = patch.calc_type
if (patch.unit_price !== undefined) update.unit_price = patch.unit_price
if (patch.percent !== undefined) update.percent = patch.percent
if (patch.channel !== undefined) update.channel = patch.channel
const { error } = await supabase.from('operating_costs').update(update).eq('id', id)
if (error) throw error
}

export async function deleteOperatingCost(id: string) {
if (!supabase) throw new Error('Supabase nao configurado.')
const { error } = await supabase.from('operating_costs').delete().eq('id', id)
if (error) throw error
}
