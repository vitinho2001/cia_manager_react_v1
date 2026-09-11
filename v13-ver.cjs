const fs = require('fs')
const lines = fs.readFileSync('src/pages/SalesPage.tsx','utf8').replace(/\r\n/g,'\n').split('\n')

function dump(start, end, label) {
  const s = lines.findIndex(l => l.includes(start))
  if (s === -1) { console.log('>>> NAO ENCONTREI: ' + start); return }
  let e = s
  if (end) { for (let i=s;i<lines.length;i++){ if(lines[i].includes(end) && i>s){e=i;break} } }
  else { let d=0; for (let i=s;i<lines.length;i++){ const o=(lines[i].match(/\{/g)||[]).length, c=(lines[i].match(/\}/g)||[]).length; d+=o-c; if(d<=0 && i>s){e=i;break} } }
  console.log('### '+label+' (linhas '+(s+1)+'-'+(e+1)+') ###')
  for(let k=s;k<=e;k++) console.log((k+1)+'| '+lines[k])
  console.log('')
}

dump('editingSale &&', null, 'MODAL DE EDICAO')
dump('<section className="panel">', '<thead>', 'SECAO DA TABELA (toolbar ate thead)')
console.log('### ESTADOS DE EDICAO ###')
lines.forEach((l,i)=>{ if(/editChannel|editQty|editTotal|useEffect/.test(l) && /useState|useEffect/.test(l)) console.log((i+1)+'| '+l) })
console.log('### IMPORT LUCIDE ###')
lines.forEach((l,i)=>{ if(l.includes("from 'lucide-react'")) console.log((i+1)+'| '+l) })