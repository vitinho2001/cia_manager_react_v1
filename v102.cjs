const fs = require('fs')
const p = 'src/pages/SalesPage.tsx'
if (!fs.existsSync(p)) { console.log('ATENCAO: SalesPage.tsx nao encontrado'); process.exit(1) }
const original = fs.readFileSync(p, 'utf8')
const eol = original.includes('\r\n') ? '\r\n' : '\n'
let s = original
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

// --- 1) Corrige ${filteredEditMenu.map(...)} -> {filteredEditMenu.map(...)} (linha 833) ---
if (s.includes('${filteredEditMenu.map(')) {
  s = s.split('${filteredEditMenu.map(').join('{filteredEditMenu.map(')
  ok('corrige ${filteredEditMenu.map} do select')
} else if (s.includes('{filteredEditMenu.map(')) ok('select ja estava correto')
else warn('filteredEditMenu nao encontrado')

// --- 2) Corrige qualquer outro "${" restante dentro do JSX do modal ---
const modalStart = s.indexOf('Editar associacao')
const modalEnd = s.indexOf('Salvar associacao', modalStart)
if (modalStart > -1 && modalEnd > -1) {
  const before = s.slice(0, modalStart)
  const mid = s.slice(modalStart, modalEnd)
  const after = s.slice(modalEnd)
  if (/\$\{/.test(mid)) {
    s = before + mid.split('${').join('{') + after
    ok('removeu ${ restantes no modal')
  } else ok('modal limpo de ${')
} else warn('bloco do modal nao delimitado')

// --- 3) Remove duplicatas de setEditQty/setEditTotal no openEdit ---
const dupBlock = [
  'setEditChannel(sale.channel)',
  'setEditQty(String(sale.quantity ?? 1))',
  'setEditTotal(String(sale.total_amount ?? 0))',
  '',
  'setEditQty(String(sale.quantity ?? 1))',
  'setEditTotal(String(sale.total_amount ?? 0))',
].join(eol)
const cleanBlock = [
  '    setEditChannel(sale.channel)',
  '    setEditQty(String(sale.quantity ?? 1))',
  '    setEditTotal(String(sale.total_amount ?? 0))',
].join(eol)
if (s.includes(dupBlock)) { s = s.split(dupBlock).join(cleanBlock); ok('remove duplicatas do openEdit') }
else {
  // tenta versao sem linha vazia
  const dup2 = ['setEditQty(String(sale.quantity ?? 1))', 'setEditTotal(String(sale.total_amount ?? 0))', '', 'setEditQty(String(sale.quantity ?? 1))', 'setEditTotal(String(sale.total_amount ?? 0))'].join(eol)
  const clean2 = ['    setEditQty(String(sale.quantity ?? 1))', '    setEditTotal(String(sale.total_amount ?? 0))'].join(eol)
  if (s.includes(dup2)) { s = s.split(dup2).join(clean2); ok('remove duplicatas do openEdit (v2)') }
  else warn('duplicatas do openEdit nao encontradas no formato esperado')
}

// --- 4) Fallback para editItemId nulo ---
if (s.includes('setEditItemId(sale.menu_item_id)')) {
  s = s.split('setEditItemId(sale.menu_item_id)').join("setEditItemId(sale.menu_item_id ?? '')")
  ok('fallback para editItemId nulo')
} else if (s.includes("setEditItemId(sale.menu_item_id ?? '')")) ok('fallback ja presente')
else warn('setEditItemId nao encontrado')

// --- 5) Preserva o item atual no select mesmo fora do filtro ---
const selAnchor = '<option value="">Sem associacao</option>'
const ghost = [
  '<option value="">Sem associacao</option>',
  '                  {editItemId && !filteredEditMenu.some((m) => m.id === editItemId) && (',
  '                    <option value={editItemId}>',
  "                      {menuItems.find((m) => m.id === editItemId)?.name ?? '(item atual)'}",
  '                    </option>',
  '                  )}',
].join(eol)
if (!s.includes('filteredEditMenu.some((m) => m.id === editItemId)')) {
  if (s.includes(selAnchor)) { s = s.split(selAnchor).join(ghost); ok('preserva item atual no select') }
  else warn('ancora "Sem associacao" nao encontrada')
} else ok('item atual ja preservado')

if (s === original) { console.log('Nada alterado.'); process.exit(0) }
fs.writeFileSync(p + '.bak102', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas')