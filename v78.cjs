const fs = require('fs')
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

// ===== 1) sales.ts: funcao de exclusao por intervalo =====
{
  const p = 'src/services/sales.ts'
  const original = fs.readFileSync(p, 'utf8')
  if (!original.includes('export async function deleteSalesRange')) {
    const fn = `

export async function deleteSalesRange(organizationId: string, fromDate: string, toDate: string) {
if (!supabase) throw new Error('Supabase nao configurado.')
const { error } = await supabase.from('sales').delete().eq('organization_id', organizationId).gte('sale_date', fromDate).lte('sale_date', toDate)
if (error) throw error
}
`
    fs.writeFileSync(p + '.bak78', original, 'utf8')
    fs.writeFileSync(p, original + fn, 'utf8')
    ok('sales.ts: deleteSalesRange criada')
  } else ok('sales.ts: deleteSalesRange ja existia')
}

// ===== 2) SalesPage.tsx =====
{
  const p = 'src/pages/SalesPage.tsx'
  const original = fs.readFileSync(p, 'utf8')
  let s = original

  const impRe = /import \{ ([^}]+) \} from '\.\.\/services\/sales'/
  if (s.includes('deleteSalesRange')) {
    ok('SalesPage: deleteSalesRange ja importada')
  } else if (impRe.test(s)) {
    s = s.replace(impRe, (m, names) => "import { " + names.trim().replace(/,\s*$/, '') + ", deleteSalesRange } from '../services/sales'")
    ok('SalesPage: import deleteSalesRange')
  } else warn('SalesPage: import de sales')

  // Confirmacao mostra o periodo real (De/Ate) e exige periodo valido
  const confOld = "const ok = window.confirm('Excluir TODAS as vendas do dia ' + date + '? Esta acao nao pode ser desfeita.')"
  const confNew = "const ok = (!!from && !!to) && window.confirm((from === to ? 'Excluir TODAS as vendas do dia ' + from + '?' : 'Excluir TODAS as vendas de ' + from + ' ate ' + to + '?') + ' Esta acao nao pode ser desfeita.')"
  if (s.includes(confOld)) { s = s.split(confOld).join(confNew); ok('confirm mostra o periodo selecionado') } else warn('confirm do Excluir tudo')

  // Exclusao usa o intervalo De/Ate em vez da data de hoje
  const delRe = /await deleteSalesByDate\(organizationId,\s*[^)]*\)/
  if (delRe.test(s)) { s = s.replace(delRe, 'await deleteSalesRange(organizationId, from, to)'); ok('exclusao usa De/Ate') } else warn('chamada de exclusao')

  // Mensagem de sucesso sem a data antiga (cosmetico)
  const msgRe = /(set\w+)\([^)]*Vendas do dia[^)]*\)/
  if (msgRe.test(s)) { s = s.replace(msgRe, (m, fn) => fn + "('Vendas excluidas.')"); ok('mensagem de sucesso atualizada') } else console.log('INFO: mensagem de sucesso nao encontrada (sem impacto)')

  if (s.includes('deleteSalesByDate(organizationId')) warn('ainda ha chamada antiga de deleteSalesByDate')

  fs.writeFileSync(p, s, 'utf8')
}

console.log('Concluido: ' + count + ' alteracoes aplicadas')