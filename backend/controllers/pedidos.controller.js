const db = require('../db/conn')
const { Pedido, ItemPedido, Produto, Estoque, Entrega, Usuario, Variante, CheckoutChave, Reserva, Pagamento } = require('../models/rel')

// POST /api/pedidos — Finalizar pedido (privado)
const crypto = require('node:crypto')
const { registrar } = require('../services/estoque.service')
const { cancelarPedido, mudarStatus } = require('../services/pedido.service')
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
    let chave, resumoHash
    const responderRepetido = async () => {
        if (!chave) return false
        const registro = await CheckoutChave.findOne({ where: { idUsuario: req.usuario.codUsuario, chave } })
        if (!registro?.idPedido) return false
        if (registro.resumo_hash !== resumoHash) falhar(409, 'Esta chave já foi usada em outro pedido. Atualize o carrinho antes de continuar.')
        const pedido = await Pedido.findByPk(registro.idPedido)
        res.status(200).json({ mensagem: 'Pedido já registrado.', repetido: true, pedido: { ...pedido.get({ plain: true }), id: pedido.codPedido } })
        return true
    }
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
        chave = req.body.chaveCheckout || crypto.randomUUID()
        if (typeof chave !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(chave)) falhar(400, 'Chave de confirmação inválida.')
        const usuarioBase = await Usuario.findByPk(req.usuario.codUsuario)
        const enderecoBase = validarEndereco(req.body.endereco_entrega ?? usuarioBase.get({ plain: true }))
        resumoHash = crypto.createHash('sha256').update(JSON.stringify({ itens, forma_pagamento, endereco: enderecoBase, observacoes: observacoes || '' })).digest('hex')
        if (await responderRepetido()) return
        const dados = await db.transaction(async transaction => {
            const registro = await CheckoutChave.create({ idUsuario: req.usuario.codUsuario, chave, resumo_hash: resumoHash }, { transaction })
            const usuario = await Usuario.findByPk(req.usuario.codUsuario, { transaction })
            if (!usuario || !usuario.ativo) falhar(401, 'Faça login novamente.')
            const endereco = enderecoBase
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
                    preco_unitario: item.preco, subtotal: item.subtotal, tamanho: item.tamanho, cor: item.cor, idVariante: item.idVariante, nome_produto: item.nome, imagem_produto: item.imagem_url
                }, { transaction })
                const variante = item.idVariante ? await Variante.findByPk(item.idVariante, { transaction, lock: transaction.LOCK.UPDATE }) : null
                await registrar({ idProduto: item.idProduto, variante, delta: -item.quantidade, tipo: 'VENDA', motivo: `Pedido #${pedido.codPedido}`, idUsuario: usuario.codUsuario, idPedido: pedido.codPedido, transaction })
            }
            await Entrega.create({
                idPedido: pedido.codPedido, status: 'PENDENTE', endereco_entrega: endereco.texto, cep_entrega: endereco.cep
            }, { transaction })
            const minutos = Math.max(5, Math.min(1440, Number(process.env.RESERVA_MINUTOS) || 30))
            const expira_em = new Date(Date.now() + minutos * 60000)
            await Reserva.create({ idPedido: pedido.codPedido, expira_em }, { transaction })
            await Pagamento.create({ idPedido: pedido.codPedido, provedor: 'demonstracao', valor: valorTotal }, { transaction })
            await registro.update({ idPedido: pedido.codPedido }, { transaction })
            return { id: pedido.codPedido, status: pedido.status, valorSubtotal, valorDesconto, motivo_desconto, valorFrete, valorTotal, expira_em }
        })
        return res.status(201).json({ mensagem: 'Pedido registrado. Pagamento pendente.', pedido: dados })
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            try { if (await responderRepetido()) return } catch (erro) { return responderErro(res, erro) }
        }
        return responderErro(res, err)
    }
}

const cancelar = async (req, res) => {
    try { return res.json({ pedido: await cancelarPedido(req.params.id, req.usuario) }) }
    catch (err) { return responderErro(res, err) }
}

// GET /api/pedidos/meus-pedidos (privado)
const meusPedidos = async (req, res) => {
    try {
        const pagina = Number(req.query.pagina ?? 1)
        const limite = Number(req.query.limite ?? 10)
        const status = req.query.status
        if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 1000000 ||
            !Number.isSafeInteger(limite) || limite < 1 || limite > 50) {
            return res.status(400).json({ erro: 'Paginação inválida. Use limite de 1 a 50.' })
        }
        if (status && !['PENDENTE', 'CONFIRMADO', 'EM_SEPARACAO', 'ENVIADO', 'ENTREGUE', 'CANCELADO'].includes(status)) {
            return res.status(400).json({ erro: 'Status de pedido inválido.' })
        }
        const { count, rows } = await Pedido.findAndCountAll({
            where: { idUsuario: req.usuario.codUsuario, ...(status ? { status } : {}) },
            include: [
                {
                    model: ItemPedido, as: 'itensPedido',
                    include: [{ model: Produto, as: 'produtoItem', attributes: ['codProduto', 'nome', 'imagem_url', 'marca'] }]
                },
                { model: Entrega, as: 'entregaPedido' }
            ],
            distinct: true,
            order: [['dataPedido', 'DESC'], ['codPedido', 'DESC']],
            limit: limite,
            offset: (pagina - 1) * limite
        })
        return res.json({ total: count, pagina, totalPaginas: Math.ceil(count / limite), pedidos: rows })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao buscar pedidos.', detalhe: err.message })
    }
}

// GET /api/pedidos/:id (privado)
const getById = async (req, res) => {
    try {
        if (!/^[1-9]\d*$/.test(req.params.id) || Number(req.params.id) > 2147483647) {
            return res.status(400).json({ erro: 'Código de pedido inválido.' })
        }
        const pedido = await Pedido.findByPk(req.params.id)
        if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' })
        if (req.usuario.tipo_usuario !== 'ADMIN' && pedido.idUsuario !== req.usuario.codUsuario) {
            return res.status(403).json({ erro: 'Acesso negado.' })
        }
        await pedido.reload({ include: [
            { model: ItemPedido, as: 'itensPedido', include: [{ model: Produto, as: 'produtoItem', attributes: ['codProduto', 'nome', 'imagem_url', 'marca'] }] },
            { model: Entrega, as: 'entregaPedido' },
            { model: Reserva, as: 'reservaPedido' },
            { model: Pagamento, as: 'pagamentoPedido', attributes: ['provedor', 'status', 'atualizado_em'] }
        ] })
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
    try { return res.json({ pedido: await mudarStatus(req.params.id, req.body.status, req.usuario) }) }
    catch (err) { return responderErro(res, err) }
}

module.exports = { criar, resumo, cancelar, meusPedidos, getById, listarTodos, atualizarStatus }
