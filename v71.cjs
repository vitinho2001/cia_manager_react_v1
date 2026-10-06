const fs = require('fs')
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

// ===== 1) sales.ts: paginacao + contagem =====
{
  const p = 'src/services/sales.ts'
  const original = fs.readFileSync(p, 'utf8')
  let s = original

  const sigOld = 'export async function listSales(organizationId: string, from?: string, to?: string) {'
  const sigNew = 'export async function listSales(organizationId: string, from?: string, to?: string, page?: number, pageSize?: number) {'
  if (s.includes(sigOld)) { s = s.split(sigOld).join(sigNew); ok('sales.ts: assinatura com pagina') } else warn('sales.ts: assinatura')

  const reRange = /if \(to\) q = q\.lte\('sale_date', to\)/
  if (reRange.test(s)) {
    s = s.replace(reRange, "if (to) q = q.lte('sale_date', to)\n  if (typeof page === 'number' && page > 0 && pageSize && pageSize > 0) q = q.range((page - 1) * pageSize, page * pageSize - 1)")
    ok('sales.ts: range de pagina') 
  } else warn('sales.ts: filtro de data')

  if (!s.includes('export async function countSales')) {
    s += `

export async function countSales(organizationId: string, from?: string, to?: string) {
  if (!supabase) throw new Error('Supabase nao configurado.')
  let q = supabase.from('sales').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId)
  if (from) q = q.gte('sale_date', from)
  if (to) q = q.lte('sale_date', to)
  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}
`
    ok('sales.ts: countSales') 
  } else ok('sales.ts: countSales ja existia')

  fs.writeFileSync(p + '.bak71', original, 'utf8')
  fs.writeFileSync(p, s, 'utf8')
}

// ===== 2) SalesPage.tsx =====
{
  const p = 'src/pages/SalesPage.tsx'
  const original = fs.readFileSync(p, 'utf8')
  let s = original

  const impOld = "import { deleteSalesByDate, createSale, createSales, deleteSale, listSales, updateSale } from '../services/sales'"
  const impNew = "import { deleteSalesByDate, createSale, createSales, deleteSale, listSales, updateSale, countSales } from '../services/sales'"
  if (s.includes(impOld)) { s = s.split(impOld).join(impNew); ok('import countSales') } else warn('import countSales')

  const stOld = 'const [loading, setLoading] = useState(false)'
  const stNew = 'const [loading, setLoading] = useState(false)\n  const [page, setPage] = useState(1)\n  const [pageSize] = useState(200)\n  const [totalCount, setTotalCount] = useState(0)'
  if (s.includes(stOld)) { s = s.split(stOld).join(stNew); ok('estados de paginacao') } else warn('estados de paginacao')

  const reLoad = /\n  const load = useCallback\(async \(\) => \{[\s\S]*?\}, \[organizationId[^\]]*\]\)/
  const newLoad = `
  const load = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    setError(null)
    try {
      const [total, saleRows, menuRows] = await Promise.all([
        countSales(organizationId, from, to),
        listSales(organizationId, from, to, page, pageSize),
        listMenuItems(organizationId),
      ])
      let rows = saleRows
      if (period.type === 'days') {
        const dayList = period.key.split(',').map((x) => x.trim()).filter(Boolean)
        if (dayList.length) rows = rows.filter((s) => dayList.includes(s.sale_date))
      }
      setTotalCount(total)
      setSales(rows)
      setMenuItems(menuRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar vendas.')
    } finally {
      setLoading(false)
    }
  }, [organizationId, from, to, page, pageSize, period])`
  if (reLoad.test(s)) { s = s.replace(reLoad, newLoad); ok('load paginado') } else warn('load paginado')

  const hFrom = 'onChange={(e) => setFrom(e.target.value)}'
  const hFromNew = 'onChange={(e) => { setFrom(e.target.value); setPage(1) }}'
  if (s.includes(hFrom)) { s = s.split(hFrom).join(hFromNew); ok('De reinicia pagina') } else warn('campo De')

  const hTo = 'onChange={(e) => setTo(e.target.value)}'
  const hToNew = 'onChange={(e) => { setTo(e.target.value); setPage(1) }}'
  if (s.includes(hTo)) { s = s.split(hTo).join(hToNew); ok('Ate reinicia pagina') } else warn('campo Ate')

  const retOld = '  return (\n    <div className="page-container">'
  const retNew = '  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))\n  const longRange = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000) > 31\n  return (\n    <div className="page-container">'
  if (s.includes(retOld)) { s = s.split(retOld).join(retNew); ok('totalPages e longRange') } else warn('return da pagina')

  const pag = `<div className="sales-pagination">
        {longRange && <div style={{ marginBottom: 10, fontSize: 12, color: '#8b5a14', background: '#fff4df', border: '1px solid #f0dcae', borderRadius: 10, padding: '8px 12px' }}>Intervalo longo: os dados sao exibidos em paginas de \${pageSize} linhas. Use "Proxima" para ver os dias finais.</div>}
        <span>\${totalCount > 0 ? 'Mostrando ' + ((page - 1) * pageSize + 1) + ' a ' + Math.min(page * pageSize, totalCount) + ' de ' + totalCount + ' vendas' : 'Sem vendas no periodo'}</span>
        <div className="sales-pagination-buttons">
          <Button variant="secondary" onClick={() => setPage(1)} disabled={page <= 1}>Primeira</Button>
          <Button variant="secondary" onClick={() => setPage(page - 1)} disabled={page <= 1}>Anterior</Button>
          <span className="sales-page-indicator">Pagina \${page} de \${totalPages}</span>
          <Button variant="secondary" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>Proxima</Button>
          <Button variant="secondary" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>Ultima</Button>
        </div>
      </div>`

  const reTbody = /(<\/tbody>\s*<\/table>\s*<\/div>)(\s*<\/section>\s*<section className="panel">\s*<h2>Lancar venda<\/h2>)/
  if (reTbody.test(s)) {
    s = s.replace(reTbody, '$1\n        ' + pag + '\n      $2')
    ok('controles de paginacao na tabela')
  } else warn('fim da tabela de vendas')

  const delOld = '<button type="button" className="icon-btn" title="Excluir" onClick={() => void removeSale(s.id)}>'
  const delNew = '<button type="button" className="btn btn-danger" style={{ display: \'inline-flex\', alignItems: \'center\', gap: 6, height: 34, padding: \'0 10px\', borderRadius: 10, fontSize: 12, fontWeight: 700 }} onClick={() => void removeSale(s.id)}><Trash2 size={15} /> Excluir</button>'
  if (s.includes(delOld)) { s = s.split(delOld).join(delNew); ok('botao Excluir claro') } else warn('botao Excluir')

  fs.writeFileSync(p, s, 'utf8')
}

// ===== 3) MenuPage.tsx: remove setSales duplicado =====
{
  const p = 'src/pages/MenuPage.tsx'
  const original = fs.readFileSync(p, 'utf8')
  const dup = 'setPurchases(purchaseData); setSales(saleData); setSales(saleData)'
  const fixed = 'setPurchases(purchaseData); setSales(saleData)'
  if (original.includes(dup)) {
    fs.writeFileSync(p, original.split(dup).join(fixed), 'utf8')
    ok('MenuPage: setSales duplicado removido')
  } else warn('MenuPage: setSales duplicado')
}

// ===== 4) CSS =====
{
  const cp = 'src/styles/global.css'
  let css = fs.readFileSync(cp, 'utf8')
  const extra = `
/* v71: paginacao das vendas */
.sales-pagination{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid #eef1ee;font-size:12px;color:#68746e}
.sales-pagination-buttons{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.sales-page-indicator{font-weight:700;color:#334039;white-space:nowrap}
`
  if (!css.includes('v71:')) { fs.writeFileSync(cp, css + extra, 'utf8'); ok('CSS paginacao') }
  else warn('CSS v71 ja aplicado')
}

console.log('Concluido: ' + count + ' alteracoes aplicadas')