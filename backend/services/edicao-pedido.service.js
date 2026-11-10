const db = require('../db/conn')
const { Op } = require('sequelize')
const { Pedido, ItemPedido, Produto, Estoque, Variante, Pagamento, Reserva, Entrega, CheckoutChave, EventoPagamento, Movimento, Avaliacao } = require('../models/rel')
const { validarItens, calcularResumo } = require('./checkout.service')
const { registrar, avisarDisponibilidade } = require('./estoque.service')
const { liberarPedido } = require('./pedido.service')
const { falhar, validarCampos, texto } = require('../utils/api.util')

async function editarPedido(codigo, body, completa, autor, transformarItens = null) {
    if (!transformarItens) validarCampos(body, ['forma_pagamento', 'observacoes', 'itens'], completa ? ['forma_pagamento', 'observacoes', 'itens'] : [])
    const dados = {}
    if (body.forma_pagamento !== undefined) {
        if (!['CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'BOLETO'].includes(body.forma_pagamento)) falhar(400, 'Forma de pagamento inválida.')
        dados.forma_pagamento = body.forma_pagamento
    }
    if (body.observacoes !== undefined) dados.observacoes = body.observacoes === null ? null : texto(body.observacoes, 2000)
    return db.transaction(async transaction => {
        const pedido = await Pedido.findByPk(codigo, { transaction, lock: transaction.LOCK.UPDATE })
        if (!pedido) falhar(404, 'Pedido não encontrado.')
        if (pedido.status !== 'PENDENTE') falhar(409, 'Só é permitido editar pedidos pendentes.')
        const pagamento = await Pagamento.findOne({ where: { idPedido: codigo }, transaction, lock: transaction.LOCK.UPDATE })
        if (pagamento && (pagamento.status !== 'PENDENTE' || pagamento.provedor !== 'demonstracao')) falhar(409, 'Não altere pedidos com pagamento processado ou enviado a um provedor externo.')
        const reserva = await Reserva.findByPk(codigo, { transaction, lock: transaction.LOCK.UPDATE })
        if (reserva && (reserva.status !== 'ATIVA' || reserva.expira_em <= new Date())) falhar(409, 'A reserva não está ativa. Revise o pedido antes de editar.')
        if (body.itens !== undefined || transformarItens) {
            const antigos = await ItemPedido.findAll({ where: { idPedido: codigo }, order: [['codItemPedido', 'ASC']], transaction, lock: transaction.LOCK.UPDATE })
            const lista = transformarItens ? transformarItens(antigos.map(item => item.toJSON())) : body.itens
            if (Array.isArray(lista) && !lista.length) falhar(409, 'O pedido precisa manter pelo menos um item. Exclua ou cancele o pedido inteiro.')
            const novos = validarItens(lista)
            const produtos = [...new Set([...antigos.map(item => item.idProduto), ...novos.map(item => item.idProduto)])].sort((a, b) => a - b)
            const saldos = new Map()
            for (const idProduto of produtos) {
                await Produto.findByPk(idProduto, { transaction, lock: transaction.LOCK.UPDATE })
                await Estoque.findOne({ where: { idProduto }, transaction, lock: transaction.LOCK.UPDATE })
                await Variante.findAll({ where: { idProduto }, order: [['codVariante', 'ASC']], transaction, lock: transaction.LOCK.UPDATE })
            }
            for (const item of antigos) {
                const variantes = await Variante.findAll({ where: { idProduto: item.idProduto }, transaction })
                const variante = item.idVariante ? variantes.find(v => v.codVariante === item.idVariante) : variantes.find(v => v.legado)
                if ((item.idVariante || variantes.length) && !variante) falhar(409, 'Não foi possível identificar a variante original para devolver o estoque.')
                if (variante && !saldos.has(variante.codVariante)) saldos.set(variante.codVariante, { variante, quantidade: variante.quantidade })
                await registrar({ idProduto: item.idProduto, variante, delta: item.quantidade, tipo: 'EDICAO_PEDIDO', motivo: `Revisão dos itens do pedido #${codigo}`, idUsuario: autor.codUsuario, idPedido: codigo, transaction, notificar: false })
            }
            const calculo = await calcularResumo(novos, transaction, true)
            const manter = []
            for (const [indice, item] of calculo.itens.entries()) {
                const valores = { idPedido: codigo, idProduto: item.idProduto, idVariante: item.idVariante, quantidade: item.quantidade, preco_unitario: item.preco, subtotal: item.subtotal, tamanho: item.tamanho, cor: item.cor, nome_produto: item.nome, imagem_produto: item.imagem_url }
                const original = transformarItens ? antigos.find(registro => registro.codItemPedido === lista[indice].codItemPedido) : null
                const registro = original ? await original.update(valores, { transaction }) : await ItemPedido.create(valores, { transaction })
                manter.push(registro.codItemPedido)
                const variante = item.idVariante ? await Variante.findByPk(item.idVariante, { transaction }) : null
                await registrar({ idProduto: item.idProduto, variante, delta: -item.quantidade, tipo: 'EDICAO_PEDIDO', motivo: `Reserva dos itens revisados do pedido #${codigo}`, idUsuario: autor.codUsuario, idPedido: codigo, transaction, notificar: false })
            }
            await ItemPedido.destroy({ where: { idPedido: codigo, codItemPedido: { [Op.notIn]: manter } }, transaction })
            for (const { variante, quantidade } of saldos.values()) {
                await variante.reload({ transaction })
                await avisarDisponibilidade(variante, quantidade, variante.quantidade, transaction)
            }
            for (const campo of ['valorSubtotal', 'valorDesconto', 'valorFrete', 'valorTotal']) dados[campo] = calculo[campo]
            if (pagamento) await pagamento.update({ valor: calculo.valorTotal, atualizado_em: new Date() }, { transaction })
        }
        await pedido.update(dados, { transaction })
        return pedido.reload({ include: [{ model: ItemPedido, as: 'itensPedido' }], transaction })
    })
}

async function excluirPedido(codigo, autor) {
    return db.transaction(async transaction => {
        const pedido = await Pedido.findByPk(codigo, { transaction, lock: transaction.LOCK.UPDATE })
        if (!pedido) falhar(404, 'Pedido não encontrado.')
        const pagamento = await Pagamento.findOne({ where: { idPedido: codigo }, transaction, lock: transaction.LOCK.UPDATE })
        if (!['PENDENTE', 'CANCELADO'].includes(pedido.status) || (pagamento && !['PENDENTE', 'CANCELADO', 'RECUSADO'].includes(pagamento.status))) falhar(409, 'Só exclua pedidos pendentes ou cancelados sem pagamento aprovado, em revisão ou reembolsado.')
        if (await Avaliacao.count({ where: { idPedido: codigo }, transaction })) falhar(409, 'Este pedido possui avaliações vinculadas.')
        if (pedido.status !== 'CANCELADO') await liberarPedido(pedido, 'Pedido excluído pela administração.', transaction, autor.codUsuario)
        if (pagamento) {
            await EventoPagamento.destroy({ where: { idPagamento: pagamento.codPagamento }, transaction })
            await pagamento.destroy({ transaction })
        }
        await CheckoutChave.destroy({ where: { idPedido: codigo }, transaction })
        await Reserva.destroy({ where: { idPedido: codigo }, transaction })
        await Entrega.destroy({ where: { idPedido: codigo }, transaction })
        await ItemPedido.destroy({ where: { idPedido: codigo }, transaction })
        await Movimento.update({ idPedido: null }, { where: { idPedido: codigo }, transaction })
        await pedido.destroy({ transaction })
    })
}

module.exports = { editarPedido, excluirPedido }
