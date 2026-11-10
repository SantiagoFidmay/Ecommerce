const { test } = require('node:test')
const assert = require('node:assert/strict')

test('numeração preserva saldo, é repetível e permite comprar o tamanho escolhido', async () => {
    const a = await require('./helpers/app').ambiente()
    try {
        const { Produto, Estoque, Variante, Movimento } = a.models
        const produto = await Produto.create({ nome: 'Modelo sem numeração', preco: 100, idCategoria: a.categoria.codCategoria })
        await Estoque.create({ idProduto: produto.codProduto, quantidade: 20 })
        const legado = await Variante.create({ idProduto: produto.codProduto, tamanho: 'Não informado', cor: 'Original', sku: 'TESTE-LEGADO', quantidade: 20, legado: true })
        const { configurarNumeracao } = require('../services/numeracao.service')
        assert.equal(await configurarNumeracao(), 1)
        assert.equal(await configurarNumeracao(), 0)
        const variantes = await Variante.findAll({ where: { idProduto: produto.codProduto, ativo: true }, order: [['tamanho', 'ASC']] })
        assert.deepEqual(variantes.map(v => v.tamanho), ['38', '39', '40', '41', '42', '43', '44'])
        assert.deepEqual(variantes.map(v => v.quantidade), [3, 3, 3, 3, 3, 3, 2])
        assert.equal((await Estoque.findOne({ where: { idProduto: produto.codProduto } })).quantidade, 20)
        assert.equal((await legado.reload()).ativo, false)
        assert.equal((await a.variante.reload()).quantidade, 5)
        assert.equal(await Movimento.sum('quantidade', { where: { idProduto: produto.codProduto } }), 0)
        // O checkout deve usar a variante escolhida como fonte da numeração.
        const selecionada = variantes.at(-1)
        const resposta = await a.request('/pedidos/resumo', a.tokens.cliente, 'POST', {
            itens: [{ idProduto: produto.codProduto, idVariante: selecionada.codVariante, quantidade: 1, tamanho: '38', cor: 'Original' }],
            forma_pagamento: 'PIX'
        })
        assert.equal(resposta.status, 200)
        assert.equal(resposta.dados.itens[0].tamanho, '44')
        assert.equal(resposta.dados.itens[0].idVariante, selecionada.codVariante)
        const compra = await a.request('/pedidos', a.tokens.cliente, 'POST', {
            itens: [{ idProduto: produto.codProduto, idVariante: selecionada.codVariante, quantidade: 1 }],
            forma_pagamento: 'PIX', chaveCheckout: require('node:crypto').randomUUID()
        })
        assert.equal(compra.status, 201)
        const item = await a.models.ItemPedido.findOne({ where: { idPedido: compra.dados.pedido.id } })
        assert.equal(item.tamanho, '44')
        assert.equal((await selecionada.reload()).quantidade, 1)
    } finally { await a.fechar() }
})
