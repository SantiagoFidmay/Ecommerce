const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const { chromium } = require('playwright')
let browser, server, base
const perfil = { codUsuario: 7, nome: 'Maria Silva', email: 'maria@example.test', cpf: '52998224725', telefone: '',
    cep: '01001000', rua: 'Praça da Sé', numero: '1', complemento: '', bairro: 'Sé', cidade: 'São Paulo', estado: 'SP', tipo_usuario: 'CLIENTE' }
const compras = Array.from({ length: 7 }, (_, index) => ({ codPedido: 701 + index, dataPedido: '2026-01-02T12:00:00Z',
    status: index === 0 ? 'ENVIADO' : 'PENDENTE', valorSubtotal: 200, valorDesconto: 0, valorFrete: 15.9, valorTotal: 215.9, forma_pagamento: 'PIX',
    itensPedido: [{ quantidade: 2, preco_unitario: 100, subtotal: 200, tamanho: '40', cor: 'Branco', produtoItem: { nome: 'Tênis de teste', imagem_url: '../assets/images/placeholder.svg' } }],
    entregaPedido: { status: 'EM_TRANSITO', endereco_entrega: 'Rua da compra, 25 - Centro, São Paulo/SP', cep_entrega: '01001000', transportadora: 'Entrega Teste', codigo_rastreio: 'BR123456789', data_previsao: '2026-01-10' } }))

for (const width of [390, 1366]) {
    test(`cadastro em ${width}px: CEP parcial permite completar rua e bairro e enviar`, async () => {
        const context = await contexto({ width, height: 844 }, false)
        try {
            let enviado
            await context.route('https://viacep.com.br/ws/88220000/json/', route => responder(route, { logradouro: '', bairro: '', localidade: 'Itapema', uf: 'SC' }))
            await context.route('http://localhost:3001/api/usuarios', async route => {
                enviado = route.request().postDataJSON()
                await responder(route, { token: 'token-de-teste', usuario: perfil }, 201)
            })
            const page = await context.newPage()
            await page.goto(base + 'pages/cadastro.html')
            for (const [campo, valor] of Object.entries({ nome: 'Maria Silva', email: 'maria@example.test', cpf: '52998224725', senha: 'SenhaSegura123', cep: '88220-000', numero: '475' })) await page.fill('#' + campo, valor)
            await page.waitForFunction(() => document.getElementById('cidade').value === 'Itapema')
            assert.match(await page.locator('#cepIndicator').innerText(), /Complete os campos/)
            await page.click('#btnCadastro')
            assert.equal(enviado, undefined)
            assert.match(await page.locator('#cadastroError').innerText(), /Informe a rua/)
            assert.equal(await page.locator('#rua').evaluate(el => el === document.activeElement), true)
            await page.fill('#rua', 'Rua de Teste')
            await page.fill('#bairro', 'Centro')
            await page.click('#btnCadastro')
            await page.waitForFunction(() => localStorage.getItem('sk_token') === 'token-de-teste')
            assert.equal(enviado.rua, 'Rua de Teste')
            assert.equal(enviado.bairro, 'Centro')
            assert.equal(enviado.cidade, 'Itapema')
            assert.equal(enviado.estado, 'SC')
        } finally { await context.close() }
    })
}

test('cadastro permite endereço manual sem ViaCEP e descarta consulta de CEP antigo', async () => {
    const context = await contexto({ width: 390, height: 844 }, false)
    try {
        await context.route('https://viacep.com.br/ws/**', route => route.abort())
        const page = await context.newPage()
        await page.goto(base + 'pages/cadastro.html')
        await page.fill('#cep', '88220-000')
        await page.waitForFunction(() => document.getElementById('cepIndicator').textContent.includes('Preencha o endereço manualmente'))
        for (const campo of ['rua', 'bairro', 'cidade', 'estado']) {
            await page.fill('#' + campo, campo === 'estado' ? 'SC' : 'Teste')
            assert.equal(await page.locator('#' + campo).getAttribute('readonly'), null)
        }
        await page.evaluate(() => {
            window.fetch = () => new Promise(resolve => { window.resolverCepAntigo = resolve })
            buscarCEP('01001000')
        })
        await page.waitForFunction(() => typeof window.resolverCepAntigo === 'function')
        await page.fill('#cep', '88')
        await page.evaluate(() => window.resolverCepAntigo({ ok: true, json: async () => ({ logradouro: 'Rua antiga', bairro: 'Antigo', localidade: 'São Paulo', uf: 'SP' }) }))
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 50)))
        assert.equal(await page.locator('#cidade').inputValue(), 'Teste')
        assert.equal(await page.locator('#cepIndicator').innerText(), '')
    } finally { await context.close() }
})

before(async () => {
    const app = require('express')()
    app.use(require('express').static(path.join(__dirname, '../..')))
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)) })
    base = `http://127.0.0.1:${server.address().port}/frontend/`
    const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    browser = await chromium.launch({ headless: true, ...(fs.existsSync(chrome) ? { executablePath: chrome } : {}) })
})

after(async () => {
    if (browser) await browser.close()
    if (server) await new Promise(resolve => server.close(resolve))
})

async function contexto(viewport, autenticado = true) {
    const context = await browser.newContext({ viewport })
    await context.route('https://fonts.googleapis.com/**', route => route.abort())
    await context.addInitScript(({ autenticado }) => {
        if (!sessionStorage.getItem('fixture')) {
            localStorage.setItem('sk_cart', JSON.stringify([{ produto_id: 1, quantidade: 1 }]))
            if (autenticado) {
                localStorage.setItem('sk_token', `e30.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.teste`)
                localStorage.setItem('sk_user', JSON.stringify({ id: 7, nome: 'Maria Silva', tipo: 'CLIENTE' }))
            }
            sessionStorage.setItem('fixture', '1')
        }
    }, { autenticado })
    return context
}

async function responder(route, dados, status = 200) {
    await route.fulfill({ status, json: dados, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
}

async function prepararApi(context, custom) {
    await context.route('http://localhost:3001/api/**', async route => {
        const req = route.request()
        const url = new URL(req.url())
        if (await custom?.(route, url)) return
        if (url.pathname === '/api/usuarios/perfil') return responder(route, perfil)
        if (url.pathname === '/api/pedidos/meus-pedidos') {
            const pagina = Number(url.searchParams.get('pagina') || 1)
            const status = url.searchParams.get('status')
            const filtrados = compras.filter(pedido => !status || pedido.status === status)
            return responder(route, { total: filtrados.length, totalPaginas: Math.ceil(filtrados.length / 6), pagina, pedidos: filtrados.slice((pagina - 1) * 6, pagina * 6) })
        }
        if (/\/pedidos\/\d+$/.test(url.pathname)) {
            const pedido = compras.find(pedido => String(pedido.codPedido) === url.pathname.split('/').at(-1))
            return responder(route, pedido || { erro: 'Pedido não encontrado.' }, pedido ? 200 : 404)
        }
        return responder(route, { erro: 'API de teste: rota não configurada.' }, 404)
    })
}

for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    test(`perfil em ${viewport.width}px: consulta, CEP, edição e troca de senha com confirmação`, async () => {
        const context = await contexto(viewport)
        try {
            const updates = []
            await prepararApi(context, async (route, url) => {
                if (url.pathname === '/api/usuarios/perfil' && route.request().method() === 'PATCH') {
                    const dados = route.request().postDataJSON()
                    updates.push(dados)
                    await responder(route, { usuario: { ...perfil, ...dados }, mensagem: 'Salvo.' })
                    return true
                }
            })
            await context.route('https://viacep.com.br/ws/01310100/json/', route => responder(route, { logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' }))
            const page = await context.newPage()
            const erros = []
            page.on('pageerror', err => erros.push(err.message))
            await page.goto(base + 'pages/perfil.html')
            await page.waitForFunction(() => !document.getElementById('perfilCampos').disabled)
            assert.equal(await page.locator('#email').inputValue(), perfil.email)
            assert.equal(await page.locator('#email').getAttribute('readonly'), '')
            assert.equal(await page.locator('#btnLogin').getAttribute('href'), base + 'pages/perfil.html')
            await page.fill('#nome', 'Maria Atualizada')
            await page.fill('#cep', '01310100')
            await page.click('#buscarCepPerfil')
            await page.waitForFunction(() => document.getElementById('rua').value === 'Avenida Paulista')
            await page.fill('#numero', '25')
            await page.click('#salvarPerfil')
            await page.waitForFunction(() => document.getElementById('perfilMessage').textContent.startsWith('Seus dados foram salvos'))
            assert.equal(updates[0].nome, 'Maria Atualizada')
            assert.equal(updates[0].numero, '25')
            assert.equal(updates[0].id, undefined)
            assert.equal(await page.evaluate(() => Auth.getUser().nome), 'Maria Atualizada')
            await page.fill('#senhaAtual', 'SenhaAtual123')
            await page.fill('#novaSenha', 'NovaSenha123')
            await page.fill('#confirmarSenha', 'Diferente123')
            await page.click('#senhaForm button[type="submit"]')
            assert.equal(updates.length, 1)
            await page.fill('#novaSenha', 'Diferente123')
            await page.click('#senhaForm button[type="submit"]')
            await page.waitForFunction(() => document.getElementById('senhaMessage').textContent === 'Senha alterada com sucesso.')
            assert.equal(updates[1].senha_atual, 'SenhaAtual123')
            assert.equal(await page.locator('#novaSenha').inputValue(), '')
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
            await page.evaluate(() => scrollTo(0, 0))
            await page.screenshot({ path: path.join(os.tmpdir(), `sportkicks-perfil-${viewport.width}.png`), fullPage: true })
            assert.deepEqual(erros, [])
        } finally { await context.close() }
    })

    test(`pedidos em ${viewport.width}px: paginação, filtro e detalhes com valores da compra`, async () => {
        const context = await contexto(viewport)
        try {
            await prepararApi(context)
            const page = await context.newPage()
            const erros = []
            page.on('pageerror', err => erros.push(err.message))
            await page.goto(base + 'pages/pedidos.html')
            await page.waitForFunction(() => document.getElementById('pedidosLista').getAttribute('aria-busy') === 'false')
            assert.equal(await page.locator('.conta-order').count(), 6)
            await page.getByRole('button', { name: 'Próxima', exact: true }).click()
            await page.waitForFunction(() => document.getElementById('pedidosPaginacao').textContent.includes('Página 2 de 2'))
            assert.equal(await page.locator('.conta-order').count(), 1)
            await page.selectOption('#filtroStatus', 'ENVIADO')
            await page.waitForFunction(() => document.getElementById('pedidosCount').textContent === '1 pedido encontrado')
            await page.screenshot({ path: path.join(os.tmpdir(), `sportkicks-pedidos-${viewport.width}.png`), fullPage: true })
            await page.getByRole('link', { name: 'Ver detalhes do pedido 701' }).click()
            await page.waitForFunction(() => document.getElementById('pedidoDetalhe')?.getAttribute('aria-busy') === 'false')
            assert.match(await page.locator('#pedidoDetalhe').innerText(), /Rua da compra, 25/)
            assert.match(await page.locator('#pedidoDetalhe').innerText(), /BR123456789/)
            assert.match(await page.locator('#pedidoDetalhe').innerText(), /215,90/)
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
            await page.evaluate(() => scrollTo(0, 0))
            await page.screenshot({ path: path.join(os.tmpdir(), `sportkicks-pedido-${viewport.width}.png`), fullPage: true })
            assert.deepEqual(erros, [])
        } finally { await context.close() }
    })
}

test('visitante retorna ao detalhe correto após login e sair preserva carrinho', async () => {
    const context = await contexto({ width: 390, height: 844 }, false)
    try {
        await prepararApi(context, async (route, url) => {
            if (url.pathname === '/api/login') {
                await responder(route, { token: `e30.${Buffer.from(JSON.stringify({ exp: Date.now() / 1000 + 3600 })).toString('base64url')}.teste`, usuario: { id: 7, nome: 'Maria Silva', tipo: 'CLIENTE' } })
                return true
            }
        })
        const page = await context.newPage()
        await page.goto(base + 'pages/pedido.html?id=701')
        await page.waitForURL('**/login.html')
        assert.match(await page.evaluate(() => sessionStorage.getItem('sk_redirect')), /pedido.html\?id=701$/)
        await page.fill('#email', perfil.email)
        await page.fill('#senha', 'SenhaTeste123')
        await page.click('#btnSubmit')
        await page.waitForURL('**/pedido.html?id=701')
        await page.click('#sairConta')
        await page.waitForURL(base + 'index.html')
        assert.equal(await page.evaluate(() => localStorage.getItem('sk_token')), null)
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('sk_cart')).length), 1)
    } finally { await context.close() }
})

test('erro de histórico não aparece como lista vazia e permite tentar novamente', async () => {
    const context = await contexto({ width: 390, height: 844 })
    try {
        let falhar = true
        await prepararApi(context, async (route, url) => {
            if (url.pathname.endsWith('/meus-pedidos')) {
                await responder(route, falhar ? { erro: 'Falha de conexão de teste.' } : { total: 0, totalPaginas: 0, pedidos: [] }, falhar ? 500 : 200)
                return true
            }
        })
        const page = await context.newPage()
        await page.goto(base + 'pages/pedidos.html')
        await page.waitForFunction(() => !document.getElementById('tentarPedidos').hidden)
        assert.equal(await page.locator('.conta-empty').count(), 0)
        falhar = false
        await page.click('#tentarPedidos')
        await page.waitForSelector('.conta-empty')
        assert.match(await page.locator('.conta-empty').innerText(), /Você ainda não fez nenhum pedido/)
    } finally { await context.close() }
})

test('sessão recusada pela API volta ao login, mesmo com token ainda não expirado', async () => {
    const context = await contexto({ width: 390, height: 844 })
    try {
        await prepararApi(context, async (route, url) => {
            if (url.pathname === '/api/usuarios/perfil') { await responder(route, { erro: 'Sessão inválida.' }, 401); return true }
        })
        const page = await context.newPage()
        await page.goto(base + 'pages/perfil.html')
        await page.waitForURL('**/login.html')
        assert.equal(await page.evaluate(() => localStorage.getItem('sk_token')), null)
        assert.match(await page.evaluate(() => sessionStorage.getItem('sk_redirect')), /perfil.html$/)
    } finally { await context.close() }
})

test('destino externo é descartado e papel ADMIN é reconhecido na sessão', async () => {
    const context = await contexto({ width: 1366, height: 768 })
    try {
        await prepararApi(context)
        const page = await context.newPage()
        await page.goto(base + 'pages/perfil.html')
        const resultado = await page.evaluate(() => {
            sessionStorage.setItem('sk_redirect', 'https://example.org/fora')
            const destino = Auth.consumeRedirect()
            localStorage.setItem('sk_user', JSON.stringify({ tipo: 'ADMIN' }))
            return { destino, admin: Auth.isAdmin() }
        })
        assert.equal(resultado.destino, base + 'index.html')
        assert.equal(resultado.admin, true)
    } finally { await context.close() }
})
