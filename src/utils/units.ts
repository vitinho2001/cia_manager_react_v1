export function convertQuantity(quantity: number, from: string, to: string): number | null {
  if (from === to) return quantity
  const weight: Record<string, number> = { mg: 0.001, g: 1, kg: 1000 }
  const volume: Record<string, number> = { ml: 1, L: 1000 }
  if (from in weight && to in weight) return (quantity * weight[from]) / weight[to]
  if (from in volume && to in volume) return (quantity * volume[from]) / volume[to]
  return null
}
