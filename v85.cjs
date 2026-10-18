const fs = require('fs')
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

// ===== 1) types/sales.ts: item_name em Sale e CreateSaleInput =====
{
  const p = 'src/types/sales.ts'
  const original = fs.readFileSync(p, 'utf8')
  if (original.includes('item_name')) {
    ok('types: item_name ja existe')
  } else {
    const lines = original.split(/\r?\n/)
    const eol = original.includes('\r\n') ? '\r\n' : '\n'
    let inserted = 0
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim() === 'source: SaleSource') { lines.splice(i + 1, 0, '  item_name?: string | null'); inserted++ }
    }
    if (inserted === 2) { fs.writeFileSync(p, lines.join(eol), 'utf8'); ok('types: item_name em Sale e CreateSaleInput') }
    else warn('types: esperava 2 ocorrencias de source, encontrei ' + inserted)
  }
}

// ===== 2) SalesPage.tsx: import grava o nome original =====
{
  const p = 'src/pages/SalesPage.tsx'
  const original = fs.readFileSync(p, 'utf8')
  if (original.includes('item_name: r.product')) {
    ok('import: item_name ja presente')
  } else {
    const anchor = 'total_amount: r.total,'
    const occ = original.split(anchor).length - 1
    if (occ === 1) {
      const eol = original.includes('\r\n') ? '\r\n' : '\n'
      fs.writeFileSync(p, original.replace(anchor, anchor + eol + '          item_name: r.product,'), 'utf8')
      ok('import: grava o nome original (item_name: r.product)')
    } else warn('import: ancora total_amount: r.total apareceu ' + occ + 'x')
  }
}

console.log('Concluido: ' + count + ' alteracoes aplicadas')