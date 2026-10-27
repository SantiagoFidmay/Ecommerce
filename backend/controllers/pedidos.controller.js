const db = require('../db/conn')
const { Pedido, ItemPedido, Produto, Estoque, Entrega, Usuario } = require('../models/rel')

// POST /api/pedidos — Finalizar pedido (privado)
const { validarItens, validarEndereco, calcularResumo, falhar } = require('../services/checkout.service')

const responderErro = (res, err) => res.status(err.status || 500).json({
    erro: err.status ? err.message : 'Não foi possível registrar o pedido. Tente novamente.'
})

const resumo = async (req, res) => {
    try {
        const itens = validarItens(req.body?.itens)
        const dados = await db.transaction(transaction => calcularResumo(itens, transaction))
        return res.json(dados)
    } catch (err) {
        return responderErro(res, err)
    }
}

const criar = async (req, res) => {
    try {
        const itens = validarItens(req.body?.itens)
        const { forma_pagamento, observacoes, valorTotalEsperado } = req.body
        if (!['CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'BOLETO'].includes(forma_pagamento)) {
            falhar(400, 'Escolha uma forma de pagamento válida.')
        }
        if (observacoes != null && (typeof observacoes !== 'string' || observacoes.length > 2000)) {
            falhar(400, 'As observações devem ter até 2000 caracteres.')
        }
        if (valorTotalEsperado !== undefined && (typeof valorTotalEsperado !== 'number' || !Number.isFinite(valorTotalEsperado))) {
            falhar(400, 'Total esperado inválido.')
        }
        const dados = await db.transaction(async transaction => {
            const usuario = await Usuario.findByPk(req.usuario.codUsuario, { transaction })
            if (!usuario || !usuario.ativo) falhar(401, 'Faça login novamente.')
            const endereco = validarEndereco(req.body.endereco_entrega ?? usuario.get({ plain: true }))
            const calculo = await calcularResumo(itens, transaction, true)
            if (valorTotalEsperado !== undefined && Math.round(valorTotalEsperado * 100) !== Math.round(calculo.valorTotal * 100)) {
                falhar(409, 'Os preços mudaram. Confira o resumo atualizado antes de confirmar novamente.')
            }
            const { valorSubtotal, valorDesconto, valorFrete, valorTotal, motivo_desconto } = calculo
            const pedido = await Pedido.create({
                idUsuario: usuario.codUsuario, valorSubtotal, valorDesconto, valorFrete, valorTotal,
                forma_pagamento, observacoes, status: 'PENDENTE'
            }, { transaction })
            for (const item of calculo.itens) {
                await ItemPedido.create({
                    idPedido: pedido.codPedido, idProduto: item.idProduto, quantidade: item.quantidade,
                    preco_unitario: item.preco, subtotal: item.subtotal, tamanho: item.tamanho, cor: item.cor
                }, { transaction })
                await Estoque.decrement('quantidade', {
                    by: item.quantidade, where: { idProduto: item.idProduto }, transaction
                })
            }
            await Entrega.create({
                idPedido: pedido.codPedido, status: 'PENDENTE', endereco_entrega: endereco.texto, cep_entrega: endereco.cep
            }, { transaction })
            return { id: pedido.codPedido, status: pedido.status, valorSubtotal, valorDesconto, motivo_desconto, valorFrete, valorTotal }
        })
        return res.status(201).json({ mensagem: 'Pedido registrado. Pagamento pendente.', pedido: dados })
    } catch (err) {
        return responderErro(res, err)
    }
}

// GET /api/pedidos/meus-pedidos (privado)
const meusPedidos = async (req, res) => {
    try {
        const pedidos = await Pedido.findAll({
            where: { idUsuario: req.usuario.codUsuario },
            include: [
                {
                    model: ItemPedido, as: 'itensPedido',
                    include: [{ model: Produto, as: 'produtoItem', attributes: ['codProduto', 'nome', 'imagem_url', 'marca'] }]
                },
                { model: Entrega, as: 'entregaPedido' }
            ],
            order: [['dataPedido', 'DESC']]
        })
        return res.json({ total: pedidos.length, pedidos })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao buscar pedidos.', detalhe: err.message })
    }
}

// GET /api/pedidos/:id (privado)
const getById = async (req, res) => {
    try {
        const pedido = await Pedido.findByPk(req.params.id, {
            include: [
                { model: ItemPedido, as: 'itensPedido', include: [{ model: Produto, as: 'produtoItem' }] },
                { model: Entrega,   as: 'entregaPedido' },
                { model: Usuario,   as: 'usuarioPedido', attributes: { exclude: ['senha'] } }
            ]
        })
        if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' })
        if (req.usuario.tipo_usuario !== 'ADMIN' && pedido.idUsuario !== req.usuario.codUsuario) {
            return res.status(403).json({ erro: 'Acesso negado.' })
        }
        return res.json(pedido)
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao buscar pedido.', detalhe: err.message })
    }
}

// GET /api/pedidos (admin)
const listarTodos = async (req, res) => {
    try {
        const pedidos = await Pedido.findAll({
            include: [
                { model: Usuario, as: 'usuarioPedido', attributes: ['codUsuario', 'nome', 'email'] },
                { model: Entrega, as: 'entregaPedido' }
            ],
            order: [['dataPedido', 'DESC']]
        })
        return res.json({ total: pedidos.length, pedidos })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao listar pedidos.', detalhe: err.message })
    }
}

// PATCH /api/pedidos/:id/status (admin)
const atualizarStatus = async (req, res) => {
    try {
        const pedido = await Pedido.findByPk(req.params.id)
        if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' })
        await pedido.update({ status: req.body.status })
        return res.json({ mensagem: 'Status atualizado!', pedido })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao atualizar status.', detalhe: err.message })
    }
}

module.exports = { criar, resumo, meusPedidos, getById, listarTodos, atualizarStatus }
