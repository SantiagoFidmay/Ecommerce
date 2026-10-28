const fs = require('node:fs/promises')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
async function build() {
    const apiBase = process.env.API_BASE_URL || (process.env.VERCEL ? null : 'http://localhost:3001/api')
    if (!apiBase) throw new Error('Configure API_BASE_URL na Vercel com o endereço público da API e /api no final.')
    const url = new URL(apiBase)
    if (!url.pathname.replace(/\/$/, '').endsWith('/api')) throw new Error('API_BASE_URL precisa terminar em /api.')
    if (!['http:', 'https:'].includes(url.protocol) || (process.env.VERCEL && url.protocol !== 'https:') || url.username || url.password) throw new Error('API_BASE_URL inválida: use a URL pública HTTPS da API, sem credenciais.')
    const destino = path.join(root, 'dist')
    if (path.dirname(path.resolve(destino)) !== root || path.basename(destino) !== 'dist') throw new Error('Diretório de saída fora do projeto.')
    await fs.rm(destino, { recursive: true, force: true })
    await fs.mkdir(destino, { recursive: true })
    for (const pasta of ['css', 'js', 'pages', 'assets', 'ajuda', 'vendor']) {
        await fs.cp(path.join(root, 'frontend', pasta), path.join(destino, pasta), { recursive: true })
    }
    await fs.copyFile(path.join(root, 'frontend/index.html'), path.join(destino, 'index.html'))
    for (const pasta of ['imagens', 'videos']) await fs.cp(path.join(root, pasta), path.join(destino, pasta), { recursive: true })
    await fs.writeFile(path.join(destino, 'js/config.js'), 'window.SPORTKICKS_CONFIG = ' + JSON.stringify({ apiBase: url.href.replace(/\/$/, '') }) + ';\n')
    const sitemapUrl = process.env.SITE_URL ? new URL(process.env.SITE_URL) : null
    const rotas = ['', 'pages/catalogo.html', 'pages/quiz.html', 'pages/comparar.html', 'pages/marcas.html']
    if (sitemapUrl) {
        const escape = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')
        await fs.writeFile(path.join(destino, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + rotas.map(rota => `<url><loc>${escape(new URL(rota, sitemapUrl).href)}</loc></url>`).join('') + '</urlset>')
    }
    await fs.writeFile(path.join(destino, 'robots.txt'), 'User-agent: *\nDisallow: /pages/admin.html\nDisallow: /pages/perfil.html\nDisallow: /pages/pedidos.html\nDisallow: /pages/pedido.html\nDisallow: /pages/colecao.html\n' + (sitemapUrl ? `Sitemap: ${new URL('sitemap.xml', sitemapUrl).href}\n` : ''))
    const conferir = async dir => {
        for (const item of await fs.readdir(dir, { withFileTypes: true })) {
            if (item.name.startsWith('.env') || ['backend', 'node_modules', '.git', '.backups'].includes(item.name)) throw new Error('Arquivo privado encontrado na saída pública.')
            if (item.isDirectory()) await conferir(path.join(dir, item.name))
        }
    }
    await conferir(destino)
    console.log('Site preparado em dist/. Somente arquivos públicos foram incluídos.')
}
if (require.main === module) build().catch(err => { console.error(err.message); process.exitCode = 1 })
module.exports = { build }
