const fs = require('fs')
let count = 0
const ok = (name) => { count++; console.log('OK: ' + name) }
const warn = (name) => console.log('ATENCAO: ' + name)

// ===== 1) VENDAS: mover seletores de periodo para o cabecalho + remover eyebrow =====
{
  const p = 'src/pages/SalesPage.tsx'
  const original = fs.readFileSync(p, 'utf8')
  let s = original

  // 1a. Remove os dois selects de periodo da toolbar (deixa o input Dia) — CRASE
  const toolbarSel = `<select className="select-control" value={period.type} onChange={(e) => { const t = e.target.value as PeriodType; setPeriod({ type: t, key: periodKey(t, new Date()) }) }} title="Tipo de periodo">{(['week','month','quarter','semester','year'] as PeriodType[]).map((t) => <option key={t} value={t}>{periodTypeLabel[t]}</option>)}</select><select className="select-control" value={period.key} onChange={(e) => setPeriod({ type: period.type, key: e.target.value })} title="Periodo">{periodOptions(period.type).map((p) => <option key={p.key} value={p.key}>{periodLabel(p)}</option>)}</select>`
  if (s.includes(toolbarSel)) { s = s.split(toolbarSel).join(''); ok('Vendas: seletores de periodo removidos da toolbar') }
  else warn('Vendas: seletores de periodo na toolbar nao encontrados')

  // 1b. Remove o eyebrow
  if (s.includes('eyebrow="Vendas"')) { s = s.split('eyebrow="Vendas"').join(''); ok('Vendas: eyebrow removido') }
  else warn('Vendas: eyebrow nao encontrado')

  // 1c. Adiciona os seletores de periodo ao lado do titulo (actions) — CRASE
  const oldActions = 'actions={<Button icon={<RefreshCw size={16} />} onClick={() => void load()} disabled={loading}>Atualizar</Button>}'
  const newActions = `actions={<><select className="select-control" value={period.type} onChange={(e) => { const t = e.target.value as PeriodType; setPeriod({ type: t, key: periodKey(t, new Date()) }) }} title="Tipo de periodo">{(['week','month','quarter','semester','year'] as PeriodType[]).map((t) => <option key={t} value={t}>{periodTypeLabel[t]}</option>)}</select><select className="select-control" value={period.key} onChange={(e) => setPeriod({ type: period.type, key: e.target.value })} title="Periodo">{periodOptions(period.type).map((p) => <option key={p.key} value={p.key}>{periodLabel(p)}</option>)}</select><Button icon={<RefreshCw size={16} />} onClick={() => void load()} disabled={loading}>Atualizar</Button></>}`
  if (s.includes(oldActions)) { s = s.split(oldActions).join(newActions); ok('Vendas: seletores de periodo movidos para o cabecalho') }
  else warn('Vendas: actions do cabecalho nao encontradas')

  fs.writeFileSync(p + '.bak50', original, 'utf8')
  fs.writeFileSync(p, s, 'utf8')
}

// ===== 2) REMOVER EYEBROW das paginas (exceto Dashboard) =====
const eyebrowFiles = [
  ['src/pages/EstoquePage.tsx', 'eyebrow="Engenharia de custos"'],
  ['src/pages/IngredientsPage.tsx', 'eyebrow="Engenharia de custos"'],
  ['src/pages/RecipesPage.tsx', 'eyebrow="Engenharia de custos"'],
  ['src/pages/MenuPage.tsx', 'eyebrow="Engenharia de cardápio"'],
]
for (const [path, eyebrow] of eyebrowFiles) {
  const original = fs.readFileSync(path, 'utf8')
  if (original.includes(eyebrow)) {
    fs.writeFileSync(path, original.split(eyebrow).join(''), 'utf8')
    ok(path.split('/').pop() + ': eyebrow removido')
  } else {
    warn(path.split('/').pop() + ': eyebrow nao encontrado')
  }
}

// ===== 3) DASHBOARD: titulo "Dashboard" -> "Bem vindo" =====
{
  const p = 'src/pages/DashboardPage.tsx'
  const original = fs.readFileSync(p, 'utf8')
  if (original.includes('title="Dashboard"')) {
    fs.writeFileSync(p, original.split('title="Dashboard"').join('title="Bem vindo"'), 'utf8')
    ok('Dashboard: titulo alterado para Bem vindo')
  } else {
    warn('Dashboard: titulo nao encontrado')
  }
}

console.log('Concluido: ' + count + ' alteracoes aplicadas')