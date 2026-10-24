const fs = require('fs')
const p = 'src/pages/DrePage.tsx'
if (!fs.existsSync(p)) { console.log('ATENCAO: DrePage.tsx nao existe. Rode node v97.cjs antes.'); process.exit(1) }
const original = fs.readFileSync(p, 'utf8')
if (original.includes('Ponto de equilibrio')) { console.log('INFO: ponto de equilibrio ja presente. Nada a fazer.'); process.exit(0) }
const eol = original.includes('\r\n') ? '\r\n' : '\n'
let s = original
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)
const ml = (lines) => lines.join(eol)

// 1) icone Target + useMemo do calculo
const impOld = "import { CircleDollarSign, Percent, TrendingDown, Wallet } from 'lucide-react'"
const impNew = "import { CircleDollarSign, Percent, Target, TrendingDown, Wallet } from 'lucide-react'"
if (s.includes(impOld)) { s = s.split(impOld).join(impNew); ok('icone Target') } else warn('import de icones')

// 2) bloco de calculo do ponto de equilibrio apos o comparativo
const anchor = '  function delta(current: number, previous: number) {'
const breakeven = ml([
'  const breakeven = useMemo(() => {',
'    if (!dre || dre.revenue <= 0) return null',
'    const marginPct = dre.margin / dre.revenue',
'    if (marginPct <= 0) return { marginPct, needed: null as number | null, progress: 0, reachable: false }',
'    const needed = dre.fixedTotal / marginPct',
'    const progress = needed > 0 ? Math.min(100, (dre.revenue / needed) * 100) : 100',
'    return { marginPct, needed, progress, reachable: dre.revenue >= needed }',
'  }, [dre])',
'',
])
if (s.includes(anchor) && !s.includes('const breakeven = useMemo')) { s = s.replace(anchor, breakeven + anchor); ok('calculo do ponto de equilibrio') } else warn('ancora do delta')

// 3) painel visual antes da secao do comparativo
const secAnchor = '      <section className="panel">' + eol + '        <div style={{ display: \'flex\', alignItems: \'center\', justifyContent: \'space-between\', gap: 10, flexWrap: \'wrap\' }}>' + eol + '          <h2>Comparativo mensal</h2>'
const panel = ml([
'      <section className="panel">',
'        <h2>Ponto de equilibrio</h2>',
'        {!breakeven && <div className="empty-state"><h2>Sem receita no periodo</h2><p className="x">O ponto de equilibrio e calculado a partir da receita e da margem de contribuicao do periodo.</p></div>}',
'        {breakeven && breakeven.needed === null && <div className="empty-state"><h2>Margem de contribuicao negativa</h2><p>O CMV e os custos variaveis consomem toda a receita. Cada venda adicional aumenta o prejuizo — revise precos e custos antes de calcular o equilíbrio.</p></div>}',
'        {breakeven && breakeven.needed !== null && (',
'          <div style={{ display: \'flex\', flexDirection: \'column\', gap: 14 }}>',
'            <div style={{ display: \'grid\', gridTemplateColumns: \'repeat(auto-fit, minmax(200px, 1fr))\', gap: 14 }}>',
'              <div>',
'                <span style={{ fontSize: 12, fontWeight: 600, color: \'#6b7280\' }}>Custos fixos a cobrir</span>',
'                <strong style={{ display: \'block\', fontSize: 18, color: \'#111827\' }}>{brl(dre!.fixedTotal)}</strong>',
'              </div>',
'              <div>',
'                <span style={{ fontSize: 12, fontWeight: 600, color: \'#6b7280\' }}>Margem de contribuicao</span>',
'                <strong style={{ display: \'block\', fontSize: 18, color: \'#111827\' }}>{pctFmt(breakeven.marginPct * 100)}</strong>',
'              </div>',
'              <div>',
'                <span style={{ fontSize: 12, fontWeight: 600, color: \'#6b7280\' }}>Receita necessaria para empatar</span>',
'                <strong style={{ display: \'block\', fontSize: 18, color: \'#111827\' }}>{brl(breakeven.needed)}</strong>',
'              </div>',
'              <div>',
'                <span style={{ fontSize: 12, fontWeight: 600, color: \'#6b7280\' }}>Falta faturar</span>',
'                <strong style={{ display: \'block\', fontSize: 18, color: breakeven.reachable ? \'#067647\' : \'#b42318\' }}>{breakeven.reachable ? \'Meta atingida\' : brl(breakeven.needed - dre!.revenue)}</strong>',
'              </div>',
'            </div>',
'            <div>',
'              <div style={{ display: \'flex\', justifyContent: \'space-between\', fontSize: 12, fontWeight: 600, color: \'#475569\', marginBottom: 6 }}>',
'                <span>{brl(dre!.revenue)} faturado</span>',
'                <span>{brl(breakeven.needed)} necessario</span>',
'              </div>',
'              <div style={{ height: 12, borderRadius: 999, background: \'#e5e7eb\', overflow: \'hidden\' }}>',
'                <div style={{ height: \'100%\', width: breakeven.progress + \'%\', background: breakeven.reachable ? \'#067647\' : \'#2563eb\', borderRadius: 999, transition: \'width .3s ease\' }} />',
'              </div>',
'              <p style={{ margin: \'8px 0 0\', fontSize: 12, color: \'#6b7280\' }}>',
'                {breakeven.reachable ? \'O periodo cobriu os custos fixos — cada real adicional e lucro.\' : pctFmt(breakeven.progress) + \' do caminho percorrido ate o equilibrio.\'}',
'              </p>',
'            </div>',
'          </div>',
'        )}',
'      </section>',
'',
])
if (s.includes(secAnchor) && !s.includes('Ponto de equilibrio</h2>')) { s = s.split(secAnchor).join(panel + secAnchor); ok('painel do ponto de equilibrio') } else warn('ancora do comparativo')

if (s === original) { console.log('Nada alterado.'); process.exit(0) }
fs.writeFileSync(p + '.bak98', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas')