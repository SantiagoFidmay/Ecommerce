const db = require('../db/conn')
const { Entrega, Pedido } = require('../models/rel')
const { id, texto, falhar, validarCampos } = require('../utils/api.util')

async function salvarEntrega(body, codigo = null, completa = false) {
    const campos = ['idPedido', 'status', 'codigo_rastreio', 'transportadora', 'endereco_entrega', 'cep_entrega', 'data_previsao', 'data_entrega', 'observacoes']
    validarCampos(body, campos, !codigo || completa ? ['idPedido', 'endereco_entrega', ...(completa ? ['status'] : [])] : [])
    const dados = !codigo || completa ? { status: 'PENDENTE', codigo_rastreio: null, transportadora: null, cep_entrega: null, data_previsao: null, data_entrega: null, observacoes: null, ...body } : { ...body }
    if (dados.idPedido !== undefined) dados.idPedido = id(dados.idPedido)
    if (dados.status !== undefined && !['PENDENTE', 'EM_TRANSITO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'TENTATIVA_FALHA', 'DEVOLVIDO'].includes(dados.status)) falhar(400, 'Status de entrega inválido.')
    for (const [campo, max] of [['codigo_rastreio', 50], ['transportadora', 100], ['endereco_entrega', 300], ['cep_entrega', 10], ['observacoes', 1000]]) {
        if (dados[campo] !== undefined && (dados[campo] !== null || campo === 'endereco_entrega')) dados[campo] = texto(dados[campo], max, campo === 'endereco_entrega')
    }
    if (dados.cep_entrega != null) {
        dados.cep_entrega = dados.cep_entrega.replace(/\D/g, '')
        if (!/^\d{8}$/.test(dados.cep_entrega)) falhar(400, 'CEP inválido.')
    }
    for (const campo of ['data_previsao', 'data_entrega']) {
        const valor = dados[campo]
        if (valor != null && (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(new Date(valor).getTime()) || new Date(valor).toISOString().slice(0, 10) !== valor)) falhar(400, 'Data inválida.')
    }
    return db.transaction(async transaction => {
        const referencia = codigo ? await Entrega.findByPk(codigo, { transaction }) : null
        if (codigo && !referencia) falhar(404, 'Entrega não encontrada.')
        if (referencia && dados.idPedido !== undefined && referencia.idPedido !== dados.idPedido) falhar(409, 'Não é permitido transferir uma entrega para outro pedido.')
        const pedido = await Pedido.findByPk(referencia?.idPedido ?? dados.idPedido, { transaction, lock: transaction.LOCK.UPDATE })
        if (!pedido) falhar(404, 'Pedido não encontrado.')
        if (pedido.status === 'CANCELADO') falhar(409, 'Não atualize a entrega de um pedido cancelado.')
        const entrega = codigo ? await Entrega.findByPk(codigo, { transaction, lock: transaction.LOCK.UPDATE }) : null
        if (codigo && !entrega) falhar(404, 'Entrega não encontrada.')
        if (!codigo && await Entrega.count({ where: { idPedido: pedido.codPedido }, transaction })) falhar(409, 'Este pedido já possui uma entrega.')
        const status = dados.status ?? entrega.status
        if (['EM_TRANSITO', 'SAIU_PARA_ENTREGA', 'ENTREGUE'].includes(status) && !['ENVIADO', 'ENTREGUE'].includes(pedido.status)) falhar(409, 'Marque o pedido como enviado antes de registrar a entrega.')
        if (pedido.status === 'ENTREGUE' && status !== 'ENTREGUE') falhar(409, 'Não é permitido reabrir uma entrega concluída.')
        if (entrega && ['endereco_entrega', 'cep_entrega'].some(campo => dados[campo] !== undefined && dados[campo] !== entrega[campo]) && pedido.status !== 'PENDENTE') falhar(409, 'Só altere o endereço enquanto o pedido estiver pendente.')
        if (status === 'ENTREGUE' && !dados.data_entrega) dados.data_entrega = entrega?.data_entrega || new Date().toISOString().slice(0, 10)
        const registro = entrega ? await entrega.update(dados, { transaction }) : await Entrega.create(dados, { transaction })
        if (status === 'ENTREGUE') await pedido.update({ status: 'ENTREGUE' }, { transaction })
        return registro
    })
}

async function excluirEntrega(codigo) {
    return db.transaction(async transaction => {
        const referencia = await Entrega.findByPk(codigo, { transaction })
        if (!referencia) falhar(404, 'Entrega não encontrada.')
        const pedido = await Pedido.findByPk(referencia.idPedido, { transaction, lock: transaction.LOCK.UPDATE })
        const entrega = await Entrega.findByPk(codigo, { transaction, lock: transaction.LOCK.UPDATE })
        if (!entrega) falhar(404, 'Entrega não encontrada.')
        if (!pedido || !['PENDENTE', 'CANCELADO'].includes(pedido.status) || entrega.status !== 'PENDENTE') falhar(409, 'Só exclua entregas pendentes de pedidos pendentes ou cancelados.')
        await entrega.destroy({ transaction })
    })
}

module.exports = { salvarEntrega, excluirEntrega }
