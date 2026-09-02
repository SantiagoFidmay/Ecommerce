const db = require('../db/conn')
const { Pedido, ItemPedido, Produto, Estoque, Entrega, Usuario } = require('../models/rel')
const { calcularDesconto, calcularFrete } = require('../utils/desconto.util')
const { QueryTypes } = require('sequelize')

// POST /api/pedidos — Finalizar pedido (privado)
const criar = async (req, res) => {
    const t = await db.transaction()
    try {
        const { itens, forma_pagamento, observacoes } = req.body
        const idUsuario = req.usuario.codUsuario

        if (!itens || itens.length === 0) {
            await t.rollback()
            return res.status(400).json({ erro: 'O pedido deve conter ao menos um item.' })
        }

        // Verificar estoque de todos os itens antes de processar
        for (const item of itens) {
            const estoque = await Estoque.findOne({ where: { idProduto: item.idProduto }, transaction: t })
            if (!estoque || estoque.quantidade < item.quantidade) {
                await t.rollback()
                const produto = await Produto.findByPk(item.idProduto)
                return res.status(400).json({
                    erro: `Estoque insuficiente para: ${produto?.nome || 'produto desconhecido'}. Disponível: ${estoque?.quantidade || 0}`
                })
            }
        }

        // Calcular subtotal
        let valorSubtotal = 0
        const itensProcessados = []

        for (const item of itens) {
            const produto = await Produto.findByPk(item.idProduto, { transaction: t })
            const preco   = parseFloat(produto.preco_promocional || produto.preco)
            const subtotalItem = preco * item.quantidade
            valorSubtotal += subtotalItem
            itensProcessados.push({ produto, preco, subtotalItem, ...item })
        }

        // Calcular desconto e frete
        const descontoInfo = calcularDesconto(valorSubtotal, itens.length)
        const valorFrete   = calcularFrete(valorSubtotal)
        const valorTotal   = descontoInfo.totalComDesconto + valorFrete

        // Buscar endereço do usuário para a entrega
        const usuario = await Usuario.findByPk(idUsuario)
        const enderecoEntrega = `${usuario.rua || ''}, ${usuario.numero || ''} - ${usuario.bairro || ''}, ${usuario.cidade || ''}/${usuario.estado || ''}`

        // Criar pedido
        const pedido = await Pedido.create({
            idUsuario,
            valorSubtotal,
            valorDesconto: descontoInfo.valor,
            valorFrete,
            valorTotal,
            forma_pagamento,
            observacoes
        }, { transaction: t })

        // Criar itens e deduzir estoque
        for (const item of itensProcessados) {
            await ItemPedido.create({
                idPedido:      pedido.codPedido,
                idProduto:     item.idProduto,
                quantidade:    item.quantidade,
                preco_unitario: item.preco,
                subtotal:      item.subtotalItem,
                tamanho:       item.tamanho,
                cor:           item.cor
            }, { transaction: t })

            // Deduz estoque
            await Estoque.decrement('quantidade', {
                by: item.quantidade,
                where: { idProduto: item.idProduto },
                transaction: t
            })
        }

        // Criar entrega automaticamente
        await Entrega.create({
            idPedido: pedido.codPedido,
            status: 'PENDENTE',
            endereco_entrega: enderecoEntrega,
            cep_entrega: usuario.cep
        }, { transaction: t })

        await t.commit()

        return res.status(201).json({
            mensagem: 'Pedido realizado com sucesso!',
            pedido: {
                id:             pedido.codPedido,
                valorSubtotal,
                valorDesconto:  descontoInfo.valor,
                motivo_desconto: descontoInfo.motivo,
                valorFrete,
                valorTotal
            }
        })
    } catch (err) {
        await t.rollback()
        return res.status(500).json({ erro: 'Erro ao criar pedido.', detalhe: err.message })
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

module.exports = { criar, meusPedidos, getById, listarTodos, atualizarStatus }
