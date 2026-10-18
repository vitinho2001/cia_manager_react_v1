const fs = require('fs')
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

function showRegion(file, a, b) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  console.log('\n--- ' + file + ' linhas ' + a + '-' + b + ' ---')
  for (let i = a - 1; i < Math.min(b, lines.length); i++) console.log((i + 1) + ': ' + lines[i])
}

// ===== 1) types/sales.ts: item_name nos dois tipos =====
{
  const p = 'src/types/sales.ts'
  const original = fs.readFileSync(p, 'utf8')
  let s = original

  if (s.includes('item_name')) {
    ok('types: item_name ja existe')
  } else {
    const saleOld = '  source: SaleSource\n  created_at: string'
    if (s.includes(saleOld)) { s = s.replace(saleOld, '  source: SaleSource\n  item_name?: string | null\n  created_at: string'); ok('types: Sale recebe item_name') }
    else { warn('types: Sale'); showRegion(p, 14, 27) }

    const inpOld = '  source: SaleSource\n}'
    if (s.includes(inpOld)) { s = s.replace(inpOld, '  source: SaleSource\n  item_name?: string | null\n}'); ok('types: CreateSaleInput recebe item_name') }
    else { warn('types: CreateSaleInput'); showRegion(p, 26, 36) }

    fs.writeFileSync(p + '.bak84', original, 'utf8')
    fs.writeFileSync(p, s, 'utf8')
  }
}

// ===== 2) SalesPage.tsx =====
{
  const p = 'src/pages/SalesPage.tsx'
  const original = fs.readFileSync(p, 'utf8')
  let s = original

  // (a) importacao grava o nome original em cada venda criada
  if (s.includes('item_name:')) {
    ok('import: item_name ja presente')
  } else {
    let needle = "source: 'import'"
    if (s.split(needle).length - 1 !== 1) needle = 'source: "import"'
    const occ = s.split(needle).length - 1
    if (occ === 1) {
      const idx = s.indexOf(needle)
      const win = s.slice(Math.max(0, idx - 1500), idx)
      const forVars = [...win.matchAll(/for \(const (\w+) of/g)].map((m) => m[1])
      const arrowVars = [...win.matchAll(/\.(\w+)\(\((\w+)\) =>/g)].map((m) => m[2])
      const all = [...forVars, ...arrowVars]
      const varName = all.length ? all[all.length - 1] : null
      const pushIdx = win.lastIndexOf('inputs.push({')
      const between = pushIdx >= 0 ? win.slice(pushIdx) : ''
      if (varName && pushIdx >= 0 && !between.includes('})')) {
        s = s.slice(0, idx) + 'item_name: ' + varName + '.name,\n      ' + s.slice(idx)
        ok('import: grava nome original (item_name: ' + varName + '.name)')
      } else {
        warn('import: nao identifiquei a variavel do produto'); showRegion(p, 420, 465)
      }
    } else {
      warn('import: encontrei ' + occ + " ocorrencias de source import"); showRegion(p, 420, 465)
    }
  }

  // (b) modal de edicao mostra o nome original
  const h3Old = '<h3>Editar associacao</h3>'
  const h3New = h3Old + '\n          {editingSale?.item_name ? <p style={{ margin: \'4px 0 0\', fontSize: 12, color: \'#68746e\' }}>Nome original (CSV): <strong>{editingSale.item_name}</strong></p> : null}'
  if (s.includes('Nome original (CSV)')) ok('modal: nome original ja presente')
  else if (s.includes(h3Old)) { s = s.split(h3Old).join(h3New); ok('modal: mostra o nome original do CSV') }
  else { warn('modal: editar associacao'); showRegion(p, 800, 830) }

  // (c) tabela mostra o nome do CSV quando difere do cardapio
  const cellOld = '{s.menu_item?.name ?? <span className="badge badge-warn">Sem associacao</span>}'
  const cellNew = "<span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}><span>{s.menu_item?.name ?? <span className=\"badge badge-warn\">Sem associacao</span>}</span>{s.item_name && s.item_name !== s.menu_item?.name ? <small style={{ fontSize: 11, color: '#8b8f8b' }}>CSV: {s.item_name}</small> : null}</span>"
  if (s.includes('CSV: {s.item_name}')) ok('tabela: nome do CSV ja presente')
  else if (s.includes(cellOld)) { s = s.split(cellOld).join(cellNew); ok('tabela: mostra o nome do CSV quando difere') }
  else { warn('tabela: celula do item'); showRegion(p, 630, 650) }

  fs.writeFileSync(p + '.bak84', original, 'utf8')
  fs.writeFileSync(p, s, 'utf8')
}

// ===== 3) verificacao do servico (sem alteracao) =====
{
  const t = fs.readFileSync('src/services/sales.ts', 'utf8')
  if (t.includes('...row')) ok('servico: listSales espalha a linha inteira (item_name vem junto)')
  else warn('servico: verificar mapeamento do listSales')
}

console.log('Concluido: ' + count + ' alteracoes aplicadas')