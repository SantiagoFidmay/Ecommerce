const db = require('../db/conn')
const { Op } = require('sequelize')
const { Pedido, ItemPedido, Produto, Estoque, Variante, Reserva, Pagamento, EventoPagamento, Notificacao } = require('../models/rel')
const { falhar } = require('./checkout.service')
const { registrar } = require('./estoque.service')

async function liberarPedido(pedido, motivo, transaction, idUsuario = null) {
    if (pedido.status === 'CANCELADO') return pedido
    const pagamento = await Pagamento.findOne({ where: { idPedido: pedido.codPedido }, transaction, lock: transaction.LOCK.UPDATE })
    if (pagamento && ['APROVADO', 'REVISAO'].includes(pagamento.status)) falhar(409, 'O pagamento precisa ser reembolsado ou revisado antes do cancelamento.')
    if (!['PENDENTE', 'CONFIRMADO', 'EM_SEPARACAO'].includes(pedido.status)) falhar(409, 'Este pedido já está em entrega e não pode ser cancelado por este fluxo.')
    const itens = await ItemPedido.findAll({ where: { idPedido: pedido.codPedido }, order: [['idProduto', 'ASC'], ['idVariante', 'ASC']], transaction })
    for (const item of itens) {
        await Produto.findByPk(item.idProduto, { transaction, lock: transaction.LOCK.UPDATE })
        await Estoque.findOne({ where: { idProduto: item.idProduto }, transaction, lock: transaction.LOCK.UPDATE })
        const variantes = await Variante.findAll({ where: { idProduto: item.idProduto }, order: [['codVariante', 'ASC']], transaction, lock: transaction.LOCK.UPDATE })
        let variante = item.idVariante ? variantes.find(v => v.codVariante === item.idVariante) : variantes.find(v => v.legado)
        if (item.idVariante && !variante) falhar(409, 'Opção do pedido não encontrada. Verifique o estoque antes de cancelar.')
        if (!item.idVariante && variantes.length && !variante) falhar(409, 'É necessário identificar a opção original deste pedido para devolver o estoque.')
        await registrar({ idProduto: item.idProduto, variante, delta: item.quantidade, tipo: 'CANCELAMENTO', motivo, idUsuario, idPedido: pedido.codPedido, transaction })
    }
    await pedido.update({ status: 'CANCELADO' }, { transaction })
    await Reserva.update({ status: 'LIBERADA' }, { where: { idPedido: pedido.codPedido }, transaction })
    if (pagamento && pagamento.status !== 'REEMBOLSADO') await pagamento.update({ status: 'CANCELADO', atualizado_em: new Date() }, { transaction })
    await Notificacao.create({ idUsuario: pedido.idUsuario, titulo: `Pedido #${pedido.codPedido} cancelado`, mensagem: motivo }, { transaction })
    return pedido
}

async function cancelarPedido(id, usuario, motivo = 'Cancelamento solicitado pelo cliente.') {
    return db.transaction(async transaction => {
        const pedido = await Pedido.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
        if (!pedido) falhar(404, 'Pedido não encontrado.')
        if (pedido.idUsuario !== usuario.codUsuario && usuario.tipo_usuario !== 'ADMIN') falhar(403, 'Acesso negado.')
        if (usuario.tipo_usuario !== 'ADMIN' && !['PENDENTE', 'CANCELADO'].includes(pedido.status)) falhar(409, 'O pedido já foi confirmado. Entre em contato com a loja para solicitar atendimento.')
        return liberarPedido(pedido, motivo, transaction, usuario.codUsuario)
    })
}

async function expirarReservas() {
    const reservas = await Reserva.findAll({ where: { status: 'ATIVA', expira_em: { [Op.lte]: new Date() } }, limit: 100 })
    let cancelados = 0
    for (const reserva of reservas) {
        await db.transaction(async transaction => {
            const pedido = await Pedido.findByPk(reserva.idPedido, { transaction, lock: transaction.LOCK.UPDATE })
            const atual = await Reserva.findByPk(reserva.idPedido, { transaction, lock: transaction.LOCK.UPDATE })
            if (pedido?.status === 'PENDENTE' && atual.status === 'ATIVA' && atual.expira_em <= new Date()) {
                await liberarPedido(pedido, 'Prazo para pagamento encerrado. As unidades voltaram ao estoque.', transaction)
                cancelados++
            }
        })
    }
    return cancelados
}

async function mudarStatus(id, status, usuario) {
    if (status === 'CANCELADO') return cancelarPedido(id, usuario, 'Pedido cancelado pela administração.')
    const transicoes = { PENDENTE: ['CONFIRMADO'], CONFIRMADO: ['EM_SEPARACAO'], EM_SEPARACAO: ['ENVIADO'], ENVIADO: ['ENTREGUE'] }
    return db.transaction(async transaction => {
        const pedido = await Pedido.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
        if (!pedido) falhar(404, 'Pedido não encontrado.')
        if (pedido.status === status) return pedido
        if (!transicoes[pedido.status]?.includes(status)) falhar(409, 'Transição de status não permitida.')
        const pagamento = await Pagamento.findOne({ where: { idPedido: id }, transaction })
        if (status === 'CONFIRMADO' && pagamento?.provedor === 'mercadopago' && pagamento.status !== 'APROVADO') falhar(409, 'Aguarde a confirmação do pagamento pelo provedor.')
        if (status === 'CONFIRMADO') {
            const reserva = await Reserva.findByPk(id, { transaction })
            if (reserva?.status === 'ATIVA' && reserva.expira_em <= new Date()) falhar(409, 'A reserva expirou. Revise o pedido antes de confirmar.')
            if (pagamento?.provedor === 'demonstracao') {
                await pagamento.update({ status: 'APROVADO', atualizado_em: new Date() }, { transaction })
                await EventoPagamento.create({ idPagamento: pagamento.codPagamento, evento: 'SIMULACAO_ADMIN_CONFIRMADA' }, { transaction })
            }
        }
        await pedido.update({ status }, { transaction })
        await Reserva.update({ status: 'CONSUMIDA' }, { where: { idPedido: id }, transaction })
        const { Entrega } = require('../models/rel')
        if (status === 'ENVIADO') await Entrega.update({ status: 'EM_TRANSITO' }, { where: { idPedido: id }, transaction })
        if (status === 'ENTREGUE') await Entrega.update({ status: 'ENTREGUE', data_entrega: new Date() }, { where: { idPedido: id }, transaction })
        await Notificacao.create({ idUsuario: pedido.idUsuario, titulo: `Pedido #${id} atualizado`, mensagem: `Nova situação: ${status.replaceAll('_', ' ').toLowerCase()}.` }, { transaction })
        return pedido
    })
}

module.exports = { cancelarPedido, liberarPedido, expirarReservas, mudarStatus }
