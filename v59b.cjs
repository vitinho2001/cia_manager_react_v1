const fs = require('fs')
const p = 'src/pages/EstoquePage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original

// Encontra a linha do periodTypeLabel por regex (ignora acentos/espacos)
const re = /const periodTypeLabel: Record<PeriodType, string> = \{([^}]*)\}/
const m = s.match(re)

if (m) {
  // Se ainda nao tem 'day', adiciona logo apos a chave de abertura
  if (!/day\s*:/.test(m[1])) {
    const newBody = " day: 'Dia'," + m[1]
    s = s.replace(re, 'const periodTypeLabel: Record<PeriodType, string> = {' + newBody + '}')
    fs.writeFileSync(p + '.bak59b', original, 'utf8')
    fs.writeFileSync(p, s, 'utf8')
    console.log('OK: rotulo Dia adicionado no periodTypeLabel')
  } else {
    console.log('INFO: rotulo Dia ja existe')
  }
} else {
  console.log('ATENCAO: periodTypeLabel nao encontrado')
}