const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const root = path.resolve(__dirname, '..')
const arquivos = []
function listar(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', 'vendor', 'dist', '.git', '.backups'].includes(item.name)) continue
        const file = path.join(dir, item.name)
        if (item.isDirectory()) listar(file)
        else if (file.endsWith('.js')) arquivos.push(file)
    }
}
for (const pasta of ['backend', 'frontend', 'tools']) listar(path.join(root, pasta))
for (const arquivo of arquivos) {
    try { execFileSync(process.execPath, ['--check', arquivo], { stdio: 'pipe' }) }
    catch (erro) { console.error(path.relative(root, arquivo)); console.error(erro.stderr.toString()); process.exit(1) }
}
console.log(`${arquivos.length} arquivos JavaScript verificados.`)
