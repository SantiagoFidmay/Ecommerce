const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const { chromium } = require('playwright')
let browser, server, base
const cart = [{ produto_id: 1, nome: 'Tênis de teste', preco: 100, preco_original: 100,
    quantidade: 3, estoque_max: 20, tamanho: null, cor: null, imagem_url: '../assets/images/placeholder.svg' }]
const resumo = { itens: [{ idProduto: 1, nome: 'Tênis de teste', quantidade: 3, preco: 100, subtotal: 300 }],
    valorSubtotal: 300, valorDesconto: 15, motivo_desconto: '5% de desconto (3+ itens)', valorFrete: 15.9, valorTotal: 300.9 }

before(async () => {
    const app = require('express')()
    app.use(require('express').static(path.join(__dirname, '../..')))
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)) })
    base = `http://127.0.0.1:${server.address().port}/frontend/pages/`
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
    await context.addInitScript(({ cart, autenticado }) => {
        // Só define a fixture uma vez para não repor o carrinho após navegação.
        if (!sessionStorage.getItem('fixture')) {
            localStorage.setItem('sk_cart', JSON.stringify(cart))
            if (autenticado) {
                localStorage.setItem('sk_token', `e30.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.teste`)
                localStorage.setItem('sk_user', JSON.stringify({ nome: 'Cliente Teste', tipo: 'CLIENTE' }))
            }
            sessionStorage.setItem('fixture', '1')
        }
    }, { cart, autenticado })
    return context
}

async function api(context, confirmar) {
    await context.route('http://localhost:3001/api/**', async route => {
        const url = route.request().url()
        let status = 200, dados
        if (url.endsWith('/usuarios/perfil')) dados = { cep: '01001000', rua: 'Praça da Sé', numero: '1', bairro: 'Sé', cidade: 'São Paulo', estado: 'SP' }
        else if (url.endsWith('/pedidos/resumo')) dados = resumo
        else return confirmar(route)
        await route.fulfill({ status, json: dados, headers: { 'Access-Control-Allow-Origin': '*' } })
    })
}

for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    test(`carrinho e checkout em ${viewport.width}px: erro preserva itens, confirmação limpa após resposta`, async () => {
        const context = await contexto(viewport)
        try {
            let chamadas = 0, payload
            await api(context, async route => {
                chamadas++
                payload = route.request().postDataJSON()
                await new Promise(resolve => setTimeout(resolve, 150))
                await route.fulfill({ status: chamadas === 1 ? 500 : 201, json: chamadas === 1
                    ? { erro: 'Falha controlada. Tente novamente.' }
                    : { pedido: { id: 42, valorTotal: 300.9 } }, headers: { 'Access-Control-Allow-Origin': '*' } })
            })
            const page = await context.newPage()
            const erros = []
            page.on('pageerror', err => erros.push(err.message))
            await page.goto(base + 'carrinho.html')
            assert.equal(await page.locator('.cart-item').count(), 1)
            assert.match(await page.locator('#summaryTotal').innerText(), /300,90/)
            if (viewport.width === 390) {
                await page.click('#hamburger')
                assert.equal(await page.locator('#navMenu').isVisible(), true)
                await page.click('#hamburger')
            }
            await page.click('#btnFinalizar')
            await page.waitForFunction(() => document.getElementById('btnText')?.textContent === 'Confirmar pedido')
            assert.equal(await page.locator('#rua').inputValue(), 'Praça da Sé')
            assert.match(await page.locator('#chkTotal').innerText(), /300,90/)
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
            await page.evaluate(() => { processarPagamento(); processarPagamento(); })
            await page.waitForFunction(() => !document.getElementById('checkoutError').hidden)
            assert.equal(chamadas, 1)
            assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('sk_cart')).length), 1)
            assert.equal(await page.locator('#successModal').isVisible(), false)
            await page.click('#btnConfirmPayment')
            await page.waitForFunction(() => !document.getElementById('successModal').classList.contains('hidden'))
            assert.equal(chamadas, 2)
            assert.equal(payload.itens[0].idProduto, 1)
            assert.equal(payload.valorTotalEsperado, 300.9)
            assert.equal(payload.endereco_entrega.estado, 'SP')
            assert.equal(await page.evaluate(() => localStorage.getItem('sk_cart')), null)
            assert.match(await page.locator('#successMessage').innerText(), /#42/)
            assert.equal(await page.locator('#btnConfirmPayment').isDisabled(), true)
            assert.deepEqual(erros, [])
        } finally { await context.close() }
    })
}

test('visitante é encaminhado ao login sem perder o carrinho', async () => {
    const context = await contexto({ width: 390, height: 844 }, false)
    try {
        const page = await context.newPage()
        await page.goto(base + 'checkout.html')
        await page.waitForURL('**/login.html')
        assert.match(await page.evaluate(() => sessionStorage.getItem('sk_redirect')), /checkout.html$/)
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('sk_cart')).length), 1)
    } finally { await context.close() }
})

test('endereço obrigatório impede envio e item pode ser removido do carrinho', async () => {
    const context = await contexto({ width: 390, height: 844 })
    try {
        let chamadas = 0
        await api(context, route => { chamadas++; return route.abort() })
        const page = await context.newPage()
        await page.goto(base + 'checkout.html')
        await page.waitForFunction(() => document.getElementById('btnText')?.textContent === 'Confirmar pedido')
        await page.fill('#numero', '')
        await page.click('#btnConfirmPayment')
        assert.equal(chamadas, 0)
        await page.click('.checkout-back')
        await page.click('button[aria-label="Remover Tênis de teste"]')
        assert.equal(await page.locator('.empty-cart').isVisible(), true)
        assert.equal(await page.locator('#cartSummary').isVisible(), false)
    } finally { await context.close() }
})
