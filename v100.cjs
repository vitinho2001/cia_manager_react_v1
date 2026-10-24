const fs = require('fs')
const p = 'src/pages/SalesPage.tsx'
if (!fs.existsSync(p)) { console.log('ATENCAO: SalesPage.tsx nao encontrado'); process.exit(1) }
const original = fs.readFileSync(p, 'utf8')
const eol = original.includes('\r\n') ? '\r\n' : '\n'
let s = original
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

// 1) Corrige o texto do cabecalho (linha 816): $ interp -> chaves normais
const oldHdr = `              Venda de <strong>\${editingSale.sale_date}</strong> — \${editingSale.quantity} x \${brl(Number(editingSale.total_amount) || 0)}.`
const newHdr = `              Venda de <strong>{editingSale.sale_date}</strong> — {editingSale.quantity} x {brl(Number(editingSale.total_amount) || 0)}.`
if (s.includes(oldHdr)) { s = s.split(oldHdr).join(newHdr); ok('corrige interpolacao do cabecalho') }
else warn('cabecalho "Venda de" nao encontrado no formato esperado')

// 2) Corrige o select de itens (linha 833): ${filteredEditMenu.map(...)} -> {filteredEditMenu.map(...)}
const oldSel = `                \${filteredEditMenu.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}`
const newSel = `                {filteredEditMenu.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}`
if (s.includes(oldSel)) { s = s.split(oldSel).join(newSel); ok('corrige interpolacao das opcoes do select') }
else warn('bloco filteredEditMenu nao encontrado no formato esperado')

// 3) Se houver mais ${ dentro do JSX (linha com "Venda de" ou com map), procura qualquer "${" restante nas linhas 800-870
const lines = s.split(new RegExp(eol))
let extraFix = 0
for (let i = 799; i < Math.min(870, lines.length); i++) {
  if (/\$\{[^}]*\}/.test(lines[i]) && !/^const |^\s*\/\//.test(lines[i])) {
    console.log('AVISO linha ' + (i + 1) + ' ainda tem ${...}: ' + lines[i].trim())
    extraFix++
  }
}
if (extraFix === 0) ok('nenhum ${...} restante no bloco do modal')

// 4) Reset do filtro ao abrir o modal (evita que o select apareca vazio por filtro anterior)
const oldOpen = `  function openEdit(sale: Sale) {
    setEditingSale(sale)
    setEditItemId(sale.menu_item_id)
    setEditQuery('')`
const newOpen = `  function openEdit(sale: Sale) {
    setEditingSale(sale)
    setEditItemId(sale.menu_item_id ?? '')
    setEditQuery('')`
if (s.includes(oldOpen)) { s = s.split(oldOpen).join(newOpen); ok('normaliza editItemId ao abrir (fallback vazio)') }
else warn('funcao openEdit no formato antigo')

// 5) Se o item salvo nao estiver no cardapio ativo, o select abre sem opcao selecionada
//    -> adiciona item fantasma para o valor atual se nao existir nas opcoes filtradas
const oldSelectBlock = `              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
                Item do cardapio
                <select className="select-control" value={editItemId} onChange={(e) => setEditItemId(e.target.value)}>
                  <option value="">Sem associacao</option>
                  {filteredEditMenu.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>`
const newSelectBlock = `              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
                Item do cardapio
                <select className="select-control" value={editItemId} onChange={(e) => setEditItemId(e.target.value)}>
                  <option value="">Sem associacao</option>
                  {editItemId && !filteredEditMenu.some((m) => m.id === editItemId) && (
                    <option value={editItemId}>
                      {menuItems.find((m) => m.id === editItemId)?.name ?? '(item atual nao disponivel)'}
                    </option>
                  )}
                  {filteredEditMenu.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>`
if (s.includes(oldSelectBlock)) { s = s.split(oldSelectBlock).join(newSelectBlock); ok('select preserva item atual mesmo fora do filtro') }
else warn('bloco do select "Item do cardapio" nao encontrado apos a correcao 2')

if (s === original) { console.log('Nada alterado.'); process.exit(0) }
fs.writeFileSync(p + '.bak100', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas')