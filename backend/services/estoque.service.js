const db = require('../db/conn')
const { Produto, Estoque, Variante, Movimento, Alerta, Notificacao } = require('../models/rel')
const { falhar } = require('./checkout.service')

async function saldoProduto(idProduto, transaction) {
    const variantes = await Variante.findAll({ where: { idProduto }, transaction })
    if (variantes.length) {
        const quantidade = variantes.filter(v => v.ativo).reduce((soma, v) => soma + v.quantidade, 0)
        await Estoque.update({ quantidade, ultima_atualizacao: new Date() }, { where: { idProduto }, transaction })
        return quantidade
    }
}

async function registrar({ idProduto, variante, delta, tipo, motivo, idUsuario = null, idPedido = null, transaction }) {
    const estoque = await Estoque.findOne({ where: { idProduto }, transaction, lock: transaction.LOCK.UPDATE })
    if (!estoque) falhar(409, 'Produto sem registro de estoque.')
    const anterior = variante ? variante.quantidade : estoque.quantidade
    const saldo = anterior + delta
    if (!Number.isSafeInteger(delta) || !Number.isSafeInteger(saldo) || saldo < 0 || saldo > 2147483647) falhar(409, 'Saldo de estoque inválido ou insuficiente.')
    if (variante) {
        await variante.update({ quantidade: saldo }, { transaction })
        await saldoProduto(idProduto, transaction)
    } else await estoque.update({ quantidade: saldo, ultima_atualizacao: new Date() }, { transaction })
    await Movimento.create({ idProduto, idVariante: variante?.codVariante ?? null, idUsuario, idPedido, tipo, quantidade: delta, saldo, motivo }, { transaction })
    if (variante?.ativo && anterior === 0 && saldo > 0) {
        const produto = await Produto.findByPk(idProduto, { transaction })
        const alertas = await Alerta.findAll({ where: { idVariante: variante.codVariante, ativo: true }, transaction, lock: transaction.LOCK.UPDATE })
        for (const alerta of alertas) {
            await Notificacao.create({ idUsuario: alerta.idUsuario, idProduto, titulo: 'Seu tamanho voltou!', mensagem: `${produto.nome}, tamanho ${variante.tamanho}, cor ${variante.cor}, está disponível novamente.` }, { transaction })
            await alerta.update({ ativo: false }, { transaction })
        }
    }
    return saldo
}

async function movimentarVariante(id, { tipo, quantidade, motivo, destino }, idUsuario) {
    if (!['ENTRADA', 'SAIDA', 'AJUSTE', 'TRANSFERENCIA'].includes(tipo) || !Number.isSafeInteger(quantidade) || quantidade < (tipo === 'AJUSTE' ? 0 : 1) || quantidade > 1000000 || typeof motivo !== 'string' || !motivo.trim() || motivo.length > 500) falhar(400, 'Informe tipo, quantidade inteira e motivo da movimentação.')
    return db.transaction(async transaction => {
        const ref = await Variante.findByPk(id, { transaction })
        if (!ref) falhar(404, 'Opção não encontrada.')
        await Produto.findByPk(ref.idProduto, { transaction, lock: transaction.LOCK.UPDATE })
        await Estoque.findOne({ where: { idProduto: ref.idProduto }, transaction, lock: transaction.LOCK.UPDATE })
        const variantes = await Variante.findAll({ where: { idProduto: ref.idProduto }, order: [['codVariante', 'ASC']], transaction, lock: transaction.LOCK.UPDATE })
        const variante = variantes.find(v => v.codVariante === Number(id))
        if (tipo === 'TRANSFERENCIA') {
            const alvo = variantes.find(v => v.codVariante === destino && v.codVariante !== variante.codVariante)
            if (!alvo || !alvo.ativo) falhar(400, 'Escolha uma opção de destino ativa do mesmo produto.')
            await registrar({ idProduto: ref.idProduto, variante, delta: -quantidade, tipo, motivo, idUsuario, transaction })
            await registrar({ idProduto: ref.idProduto, variante: alvo, delta: quantidade, tipo, motivo, idUsuario, transaction })
        } else {
            const delta = tipo === 'AJUSTE' ? quantidade - variante.quantidade : tipo === 'SAIDA' ? -quantidade : quantidade
            await registrar({ idProduto: ref.idProduto, variante, delta, tipo, motivo, idUsuario, transaction })
        }
        return variante
    })
}
module.exports = { registrar, saldoProduto, movimentarVariante }
