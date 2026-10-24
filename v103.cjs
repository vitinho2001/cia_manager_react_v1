const fs = require('fs')
const p = 'src/pages/DrePage.tsx'
if (!fs.existsSync(p)) { console.log('ATENCAO: DrePage.tsx nao encontrado'); process.exit(1) }
const original = fs.readFileSync(p, 'utf8')
if (original.includes('Ponto de equilibrio')) { console.log('INFO: ponto de equilibrio ja presente. Nada a fazer.'); process.exit(0) }
const eol = original.includes('\r\n') ? '\r\n' : '\n'
let s = original
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)
const ml = (lines) => lines.join(eol)

// 1) icone Target
const impOld = "import { CircleDollarSign, Percent, TrendingDown, Wallet } from 'lucide-react'"
const impNew = "import { CircleDollarSign, Percent, Target, TrendingDown, Wallet } from 'lucide-react'"
if (s.includes(impOld)) { s = s.split(impOld).join(impNew); ok('icone Target') }
else if (s.includes('Target')) ok('icone Target ja presente')
else warn('import de icones')

// 2) calculo do breakeven antes de "function delta"
const anchor = '  function delta('
const calc = ml([
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
if (s.includes(anchor) && !s.includes('const breakeven = useMemo')) { s = s.split(anchor).join(calc + anchor); ok('calculo do ponto de equilibrio') }
else warn('ancora "function delta(" nao encontrada')

// 3) painel visual antes da secao do comparativo
const secMarker = '<h2>Comparativo mensal</h2>'
const secIdx = s.indexOf(secMarker)
if (secIdx > -1 && !s.includes('Ponto de equilibrio</h2>')) {
  const panel = ml([
'      <section className="panel">',
'        <h2>Ponto de equilíbrio</h2>',
'        {!breakeven && <div className="empty-state"><h2>Sem receita no período</h2><p>O ponto de equilíbrio é calculado a partir da receita e da margem de contribuição do período.</p></div>}',
'        {breakeven && breakeven.needed === null && <div className="empty-state"><h2>Margem de contribuição negativa</h2><p>O CMV e os custos variáveis consomem toda a receita. Cada venda adicional aumenta o prejuízo — revise preços e custos antes de calcular o equilíbrio.</p></div>}',
'        {breakeven && breakeven.needed !== null && dre && (',
'          <div style={{ display: \'flex\', flexDirection: \'column\', gap: 16 }}>',
'            <div style={{ display: \'grid\', gridTemplateColumns: \'repeat(auto-fit, minmax(190px, 1fr))\', gap: 16 }}>',
'              <div>',
'                <span style={{ fontSize: 12, fontWeight: 600, color: \'#6b7280\' }}>Custos fixos a cobrir</span>',
'                <strong style={{ display: \'block\', fontSize: 18, color: \'#111827\', marginTop: 2 }}>{brl(dre.fixedTotal)}</strong>',
'              </div>',
'              <div>',
'                <span style={{ fontSize: 12, fontWeight: 600, color: \'#6b7280\' }}>Margem de contribuição</span>',
'                <strong style={{ display: \'block\', fontSize: 18, color: \'#111827\', marginTop: 2 }}>{pctFmt(breakeven.marginPct * 100)}</strong>',
'              </div>',
'              <div>',
'                <span style={{ fontSize: 12, fontWeight: 600, color: \'#6b7280\' }}>Receita para empatar</span>',
'                <strong style={{ display: \'block\', fontSize: 18, color: \'#111827\', marginTop: 2 }}>{brl(breakeven.needed)}</strong>',
'              </div>',
'              <div>',
'                <span style={{ fontSize: 12, fontWeight: 600, color: \'#6b7280\' }}>{breakeven.reachable ? \'Situação\' : \'Falta faturar\'}</span>',
'                <strong style={{ display: \'block\', fontSize: 18, color: breakeven.reachable ? \'#067647\' : \'#b42318\', marginTop: 2 }}>',
'                  {breakeven.reachable ? \'Meta atingida\' : brl(breakeven.needed - dre.revenue)}',
'                </strong>',
'              </div>',
'            </div>',
'            <div>',
'              <div style={{ display: \'flex\', justifyContent: \'space-between\', fontSize: 12, fontWeight: 600, color: \'#475569\', marginBottom: 6 }}>',
'                <span>{brl(dre.revenue)} faturado</span>',
'                <span>{brl(breakeven.needed)} necessário</span>',
'              </div>',
'              <div style={{ height: 12, borderRadius: 999, background: \'#e5e7eb\', overflow: \'hidden\' }}>',
'                <div style={{ height: \'100%\', width: breakeven.progress + \'%\', background: breakeven.reachable ? \'#067647\' : \'#2563eb\', borderRadius: 999, transition: \'width .3s ease\' }} />',
'              </div>',
'              <p style={{ margin: \'8px 0 0\', fontSize: 12, color: \'#6b7280\' }}>',
'                {breakeven.reachable ? \'O período cobriu os custos fixos — cada real adicional é lucro.\' : pctFmt(breakeven.progress) + \' do caminho percorrido até o equilíbrio.\'}',
'              </p>',
'            </div>',
'          </div>',
'        )}',
'        <p style={{ margin: \'12px 0 0\', fontSize: 12, color: \'#6b7280\' }}>',
'          Fórmula: custos fixos ÷ margem de contribuição %. Custos variáveis e CMV já estão descontados na margem.',
'        </p>',
'      </section>',
'',
  ])
  // envolve a section do comparativo: insere o painel logo antes do <section className="panel"> que a contem
  const before = s.slice(0, secIdx)
  const lastPanel = before.lastIndexOf('<section className="panel">')
  if (lastPanel > -1) {
    s = s.slice(0, lastPanel) + panel + s.slice(lastPanel)
    ok('painel do ponto de equilibrio')
  } else warn('section do comparativo nao localizada')
} else if (s.includes('Ponto de equilibrio</h2>')) ok('painel ja presente')
else warn('marcador do comparativo nao encontrado')

if (s === original) { console.log('Nada alterado.'); process.exit(0) }
fs.writeFileSync(p + '.bak103', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas')