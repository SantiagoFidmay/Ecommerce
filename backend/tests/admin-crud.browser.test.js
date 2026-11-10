const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const { chromium } = require('playwright')
let a, browser, front, base

before(async () => {
    a = await require('./helpers/app').ambiente()
    const express = require('express'), app = express(), root = path.join(__dirname, '../..')
    app.use(express.static(path.join(root, 'frontend')))
    front = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)) })
    base = `http://127.0.0.1:${front.address().port}/`
    const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    browser = await chromium.launch({ headless: true, ...(fs.existsSync(chrome) ? { executablePath: chrome } : {}) })
})
after(async () => {
    if (browser) await browser.close()
    if (front) await new Promise(resolve => front.close(resolve))
    if (a) await a.fechar()
})

async function abrir(viewport) {
    const context = await browser.newContext({ viewport })
    await context.route('https://fonts.googleapis.com/**', route => route.abort())
    await context.route('http://localhost:3001/api/**', async route => {
        const response = await route.fetch({ url: route.request().url().replace('http://localhost:3001/api', a.base) })
        await route.fulfill({ response })
    })
    await context.addInitScript(({ token, id }) => {
        localStorage.setItem('sk_token', token)
        localStorage.setItem('sk_user', JSON.stringify({ id, nome: 'Gestor Teste', tipo: 'ADMIN' }))
    }, { token: a.tokens.gestor, id: a.gestor.codUsuario })
    const page = await context.newPage(), erros = []
    page.setDefaultTimeout(12000)
    page.on('pageerror', erro => erros.push(erro.message))
    page.on('dialog', dialog => dialog.accept())
    await page.goto(base + 'pages/admin.html')
    await page.getByRole('button', { name: 'Gestão de registros', exact: true }).click()
    await pronto(page)
    return { page, context, erros }
}
async function pronto(page) {
    await page.waitForFunction(() => document.querySelector('#gestaoResultados').getAttribute('aria-busy') === 'false' && document.querySelector('#gestaoContagem').textContent.includes('registro(s)'))
}
async function entidade(page, nome) {
    await page.selectOption('#gestaoEntidade', nome)
    await pronto(page)
}
async function consulta(page, valor, criterio = 'codigo') {
    await page.selectOption('#gestaoCriterio', criterio)
    await page.fill('#gestaoTermo', String(valor))
    await page.locator('#gestaoBuscaForm').getByRole('button', { name: 'Consultar', exact: true }).click()
    await pronto(page)
}
async function novo(page) {
    await page.click('#gestaoNovo')
    await page.waitForSelector('#gestaoEditor:not([hidden])')
}
async function editar(page) {
    await page.locator('#gestaoResultados').getByRole('button', { name: 'Editar', exact: true }).first().click()
    await page.waitForSelector('#gestaoEditor:not([hidden])')
}
async function enviar(page, metodo, rota, completo = false, esperado = 200) {
    const resposta = page.waitForResponse(r => new URL(r.url()).pathname === '/api' + rota && r.request().method() === metodo)
    await page.click(completo ? '#gestaoSalvarCompleto' : '#gestaoSalvar')
    const recebido = await resposta
    const dados = await recebido.json()
    assert.equal(recebido.status(), esperado, JSON.stringify(dados))
    if (esperado < 400) { await page.waitForSelector('#gestaoEditor[hidden]', { state: 'attached' }); await pronto(page) }
    else await page.waitForSelector('#gestaoMensagem.conta-message-error:not([hidden])')
    return dados
}
async function excluir(page, rota, esperado = 200, nome = 'Excluir') {
    const resposta = page.waitForResponse(r => new URL(r.url()).pathname === '/api' + rota && r.request().method() === 'DELETE')
    await page.locator('#gestaoResultados').getByRole('button', { name: nome, exact: true }).first().click()
    const recebido = await resposta
    assert.equal(recebido.status(), esperado, await recebido.text())
    if (esperado < 400) await pronto(page)
    else await page.waitForSelector('#gestaoMensagem.conta-message-error:not([hidden])')
}

for (const width of [1366, 390]) {
    test(`gestão em ${width}px: categorias, produtos, usuários e estoque pela tela`, async () => {
        const produtoSemEstoque = await a.models.Produto.create({ nome: `Sem estoque ${width}`, preco: 100, marca: 'Adidas', idCategoria: a.categoria.codCategoria })
        const { page, context, erros } = await abrir({ width, height: 844 })
        try {
            await entidade(page, 'categorias'); await novo(page)
            await page.fill('#gestao-nome', `Categoria UI ${width}`)
            await page.fill('#gestao-descricao', 'Descrição completa')
            const categoria = (await enviar(page, 'POST', '/categorias', false, 201)).categoria
            await consulta(page, categoria.codCategoria)
            await editar(page); await page.fill('#gestao-icone', 'corrida')
            await enviar(page, 'PATCH', `/categorias/${categoria.codCategoria}`)
            await editar(page); await page.fill('#gestao-descricao', 'Atualizada pelo formulário completo')
            await enviar(page, 'PUT', `/categorias/${categoria.codCategoria}`, true)
            assert.equal((await a.models.Categoria.findByPk(categoria.codCategoria)).descricao, 'Atualizada pelo formulário completo')
            await excluir(page, `/categorias/${categoria.codCategoria}`, 200, 'Desativar')
            await page.locator('#gestaoResultados').getByRole('button', { name: 'Reativar', exact: true }).click()
            await page.waitForFunction(() => document.querySelector('#gestaoMensagem').textContent === 'Registro reativado.')

            await entidade(page, 'usuarios'); await novo(page)
            for (const [key, value] of Object.entries({ nome: `Pessoa UI ${width}`, email: `pessoa-ui-${width}@example.test`, cpf: width === 1366 ? '16899535009' : '39053344705', senha: 'SenhaTeste123', cep: '01001000', rua: 'Rua Teste', numero: '10', bairro: 'Centro', cidade: 'São Paulo', estado: 'SP' })) await page.fill('#gestao-' + key, value)
            const usuario = (await enviar(page, 'POST', '/usuarios', false, 201)).usuario
            assert.equal(await page.evaluate(() => localStorage.getItem('sk_token')), a.tokens.gestor)
            await consulta(page, usuario.id); await editar(page)
            await page.fill('#gestao-nome', `Pessoa editada ${width}`)
            await enviar(page, 'PATCH', `/usuarios/${usuario.id}`)
            await editar(page); await page.fill('#gestao-email', `pessoa-editada-${width}@example.test`)
            await enviar(page, 'PUT', `/usuarios/${usuario.id}`, true)
            assert.equal((await a.models.Usuario.findByPk(usuario.id)).email, `pessoa-editada-${width}@example.test`)
            await excluir(page, `/usuarios/${usuario.id}`, 200, 'Desativar')

            await entidade(page, 'estoque'); await novo(page)
            await page.selectOption('#gestao-idProduto', String(produtoSemEstoque.codProduto))
            const estoque = (await enviar(page, 'POST', '/estoque', false, 201)).estoque
            await consulta(page, estoque.codEstoque); await editar(page)
            await page.fill('#gestao-quantidade', '2')
            await page.fill('#gestao-quantidade_minima', '1')
            await enviar(page, 'PUT', `/estoque/${estoque.codEstoque}`, true)
            await excluir(page, `/estoque/${estoque.codEstoque}`, 409)
            await editar(page); await page.fill('#gestao-quantidade', '0')
            await enviar(page, 'PATCH', `/estoque/${estoque.codEstoque}`)
            await excluir(page, `/estoque/${estoque.codEstoque}`)
            assert.equal(await a.models.Estoque.findByPk(estoque.codEstoque), null)

            await entidade(page, 'produtos')
            await page.click('#gestaoNovo')
            await page.waitForSelector('#tab-catalogo:not([hidden])')
            await page.fill('#produtoNome', `Produto UI ${width}`)
            await page.selectOption('#produtoMarca', 'Adidas')
            await page.selectOption('#produtoCategoria', String(a.categoria.codCategoria))
            await page.fill('#produtoPreco', '150')
            const criar = page.waitForResponse(r => r.url().endsWith('/api/admin/produtos') && r.request().method() === 'POST')
            await page.getByRole('button', { name: 'Salvar produto', exact: true }).click()
            const criado = await criar; assert.equal(criado.status(), 201)
            const produto = (await criado.json()).produto
            await page.getByRole('button', { name: 'Gestão de registros', exact: true }).click(); await pronto(page)
            await consulta(page, produto.codProduto)
            await page.locator('#gestaoResultados').getByRole('button', { name: 'Editar', exact: true }).click()
            await page.waitForSelector('#tab-catalogo:not([hidden])')
            await page.fill('#produtoDescricao', 'Edição completa pela administração')
            const salvar = page.waitForResponse(r => r.url().endsWith(`/api/produtos/${produto.codProduto}`) && r.request().method() === 'PUT')
            await page.click('#produtoSalvarCompleto')
            assert.equal((await salvar).status(), 200)
            await page.getByRole('button', { name: 'Gestão de registros', exact: true }).click(); await pronto(page)
            await consulta(page, produto.codProduto)
            await excluir(page, `/produtos/${produto.codProduto}`, 200, 'Desativar')
            await page.locator('#gestaoResultados').getByRole('button', { name: 'Consultar', exact: true }).click()
            await page.waitForSelector('#gestaoDetalhes:not([hidden])')
            assert.match(await page.locator('#gestaoDetalhesConteudo').innerText(), /Edição completa pela administração/)
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
            await page.screenshot({ path: path.join(os.tmpdir(), `sportkicks-gestao-cadastros-${width}.png`), fullPage: true })
            assert.deepEqual(erros, [])
        } finally { await context.close() }
    })

    test(`gestão em ${width}px: pedido de cliente, itens, entrega, rollback e exclusão pela tela`, async () => {
        const produto = await a.models.Produto.create({ nome: `Pedido UI ${width}`, preco: 100, marca: 'Adidas', idCategoria: a.categoria.codCategoria })
        await a.models.Estoque.create({ idProduto: produto.codProduto, quantidade: 5 })
        const variante = await a.models.Variante.create({ idProduto: produto.codProduto, sku: `UI-${width}`, tamanho: '40', cor: 'Branco', quantidade: 5 })
        const { page, context, erros } = await abrir({ width, height: 844 })
        try {
            await entidade(page, 'pedidos'); await novo(page)
            await page.selectOption('#gestao-idUsuario', String(a.cliente.codUsuario))
            assert.equal(await page.inputValue('#gestao-endereco_rua'), a.cliente.rua)
            await page.locator('.gestao-item-produto').selectOption(String(produto.codProduto))
            await page.locator('.gestao-item-variante').selectOption(String(variante.codVariante))
            await page.click('#gestaoCalcular')
            await page.waitForFunction(() => document.querySelector('#gestaoTotais').textContent.includes('Prévia'))
            const pedido = (await enviar(page, 'POST', '/admin/pedidos', false, 201)).pedido
            assert.equal((await a.models.Pedido.findByPk(pedido.id)).idUsuario, a.cliente.codUsuario)
            assert.equal((await variante.reload()).quantidade, 4)
            const venda = await a.models.Movimento.findOne({ where: { idPedido: pedido.id, tipo: 'VENDA' } })
            assert.equal(venda.idUsuario, a.gestor.codUsuario)
            await consulta(page, pedido.id); await editar(page)
            await page.locator('.gestao-item-quantidade').fill('2')
            await enviar(page, 'PATCH', `/pedidos/${pedido.id}`)
            await editar(page); await page.fill('#gestao-observacoes', 'Pedido revisado no painel')
            await enviar(page, 'PUT', `/pedidos/${pedido.id}`, true)
            assert.equal((await variante.reload()).quantidade, 3)

            await entidade(page, 'itens-pedido'); await novo(page)
            await page.selectOption('#gestao-idPedido', String(pedido.id))
            await page.locator('.gestao-item-produto').selectOption(String(produto.codProduto))
            await page.locator('.gestao-item-variante').selectOption(String(variante.codVariante))
            const item = (await enviar(page, 'POST', '/itens-pedido', false, 201)).item
            await consulta(page, item.codItemPedido); await editar(page)
            await page.locator('.gestao-item-quantidade').fill('3')
            await enviar(page, 'PUT', `/itens-pedido/${item.codItemPedido}`, true)
            assert.equal((await variante.reload()).quantidade, 0)
            await editar(page); await page.locator('.gestao-item-quantidade').fill('6')
            await enviar(page, 'PATCH', `/itens-pedido/${item.codItemPedido}`, false, 409)
            assert.equal((await variante.reload()).quantidade, 0)
            await page.locator('.gestao-item-quantidade').fill('1')
            await enviar(page, 'PATCH', `/itens-pedido/${item.codItemPedido}`)
            await excluir(page, `/itens-pedido/${item.codItemPedido}`)
            assert.equal((await variante.reload()).quantidade, 3)

            await entidade(page, 'entregas')
            const original = await a.models.Entrega.findOne({ where: { idPedido: pedido.id } })
            await consulta(page, original.codEntrega); await excluir(page, `/entregas/${original.codEntrega}`)
            await novo(page); await page.selectOption('#gestao-idPedido', String(pedido.id))
            await page.fill('#gestao-endereco_entrega', 'Rua Nova, 10 - Centro, São Paulo/SP')
            const entrega = (await enviar(page, 'POST', '/entregas', false, 201)).entrega
            await consulta(page, entrega.codEntrega); await editar(page)
            await page.fill('#gestao-codigo_rastreio', 'BR123456789')
            await enviar(page, 'PATCH', `/entregas/${entrega.codEntrega}`)
            await editar(page); await page.fill('#gestao-transportadora', 'Entrega Teste')
            await enviar(page, 'PUT', `/entregas/${entrega.codEntrega}`, true)
            assert.equal((await a.models.Entrega.findByPk(entrega.codEntrega)).transportadora, 'Entrega Teste')
            await entidade(page, 'pedidos'); await consulta(page, pedido.id)
            await page.locator('#gestaoResultados').getByRole('button', { name: 'Consultar', exact: true }).click()
            await page.waitForSelector('#gestaoDetalhes:not([hidden])')
            assert.match(await page.locator('#gestaoDetalhesConteudo').innerText(), /Pedido revisado no painel/)
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
            await page.screenshot({ path: path.join(os.tmpdir(), `sportkicks-gestao-pedidos-${width}.png`), fullPage: true })
            await excluir(page, `/pedidos/${pedido.id}`)
            assert.equal((await variante.reload()).quantidade, 5)
            assert.equal(await a.models.Pedido.findByPk(pedido.id), null)
            assert.deepEqual(erros, [])
        } finally { await context.close() }
    })
}

test('falha de rede na consulta exibe erro e permite recarregar, sem mostrar lista vazia', async () => {
    const { page, context } = await abrir({ width: 390, height: 844 })
    try {
        await context.route('http://localhost:3001/api/usuarios', route => route.abort())
        await page.selectOption('#gestaoEntidade', 'usuarios')
        await page.waitForSelector('#gestaoMensagem.conta-message-error:not([hidden])')
        assert.match(await page.locator('#gestaoResultados').innerText(), /Não foi possível carregar/)
        await context.unroute('http://localhost:3001/api/usuarios')
        await page.click('#gestaoRecarregar'); await pronto(page)
        assert.match(await page.locator('#gestaoResultados').innerText(), /Cliente Teste/)
    } finally { await context.close() }
})
