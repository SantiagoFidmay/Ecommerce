const db = require('../db/conn')
const { Produto, Estoque, Variante } = require('../models/rel')
const { registrar } = require('./estoque.service')

const tamanhos = ['38', '39', '40', '41', '42', '43', '44']

async function configurarNumeracao() {
    return db.transaction(async transaction => {
        const produtos = await Produto.findAll({ order: [['codProduto', 'ASC']], transaction, lock: transaction.LOCK.UPDATE })
        let atualizados = 0
        for (const produto of produtos) {
            const estoque = await Estoque.findOne({ where: { idProduto: produto.codProduto }, transaction, lock: transaction.LOCK.UPDATE })
            const variantes = await Variante.findAll({ where: { idProduto: produto.codProduto }, transaction, lock: transaction.LOCK.UPDATE })
            // Apenas converte o cadastro demonstrativo ainda sem numeração.
            if (!estoque || variantes.length !== 1 || !variantes[0].legado || !variantes[0].ativo) continue
            const origem = variantes[0]
            const total = origem.quantidade
            const motivo = 'Distribuição do estoque demonstrativo entre os tamanhos 38 a 44'
            const novas = []
            for (const tamanho of tamanhos) {
                novas.push(await Variante.create({ idProduto: produto.codProduto, tamanho, cor: origem.cor, sku: `NUM-${produto.codProduto}-${tamanho}`, quantidade: 0 }, { transaction }))
            }
            if (total) await registrar({ idProduto: produto.codProduto, variante: origem, delta: -total, tipo: 'TRANSFERENCIA', motivo, transaction })
            for (const [indice, variante] of novas.entries()) {
                const quantidade = Math.floor(total / tamanhos.length) + (indice < total % tamanhos.length ? 1 : 0)
                if (quantidade) await registrar({ idProduto: produto.codProduto, variante, delta: quantidade, tipo: 'TRANSFERENCIA', motivo, transaction })
            }
            await origem.update({ ativo: false }, { transaction })
            atualizados++
        }
        return atualizados
    })
}

module.exports = { tamanhos, configurarNumeracao }
