const fs = require('fs')
const lines = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8').split(/\r?\n/)
console.log('===== DashboardPage linhas 1-125 =====')
for (let i = 0; i < Math.min(125, lines.length); i++) console.log((i + 1) + ': ' + lines[i])