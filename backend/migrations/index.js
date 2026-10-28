const db = require('../db/conn')
const { DataTypes } = require('sequelize')
const { Produto, Estoque, Marca, Variante, Midia, HistoricoPreco, Migracao, Pedido, Pagamento, Reserva, ItemPedido } = require('../models/rel')
const { marcas, reviews } = require('../data/catalogo')

async function migrar() {
    db.options.logging = false
    const connection = await db.connectionManager.getConnection()
    let locked = false
    try {
        const [rows] = await connection.promise().query("SELECT GET_LOCK('sportkicks-migrations-v1', 30) AS adquirido")
        if (!rows[0].adquirido) throw new Error('Outra migração está em execução.')
        locked = true
        await db.sync() // Cria somente tabelas ausentes; nunca usa force/alter.
        const produtoCampos = await db.getQueryInterface().describeTable('produtos')
        if (!produtoCampos.idMarca) await db.getQueryInterface().addColumn('produtos', 'idMarca', { type: DataTypes.INTEGER, allowNull: true, references: { model: 'marcas', key: 'codMarca' } })
        const nome = '20261027-catalogo-operacao'
        if (!await Migracao.findByPk(nome)) {
        const qi = db.getQueryInterface()
        const tabela = await qi.describeTable('itens_pedido')
        for (const [campo, tipo] of [['idVariante', DataTypes.INTEGER], ['nome_produto', DataTypes.STRING(150)], ['imagem_produto', DataTypes.STRING(500)]]) {
            if (!tabela[campo]) await qi.addColumn('itens_pedido', campo, { type: tipo, allowNull: true })
        }
        if (tabela.tamanho.type === 'VARCHAR(10)') await qi.changeColumn('itens_pedido', 'tamanho', { type: DataTypes.STRING(20), allowNull: true })
        await db.transaction(async transaction => {
            for (const [ordem, marca] of marcas.entries()) await Marca.findOrCreate({ where: { slug: marca.slug }, defaults: { ...marca, ordem, descricao: `Conheça os modelos ${marca.nome} do nosso catálogo e acesse os canais oficiais da marca.` }, transaction })
            for (const produto of await Produto.findAll({ transaction })) {
                const [estoque] = await Estoque.findOrCreate({ where: { idProduto: produto.codProduto }, defaults: { quantidade: 0 }, transaction })
                await Variante.findOrCreate({ where: { sku: `LEGADO-${produto.codProduto}` }, defaults: {
                    idProduto: produto.codProduto, tamanho: 'Não informado', cor: 'Original', quantidade: estoque.quantidade, legado: true
                }, transaction })
                await HistoricoPreco.create({ idProduto: produto.codProduto, preco: produto.preco_promocional ?? produto.preco }, { transaction })
                const review = reviews.find(([regex]) => regex.test(produto.nome))
                if (review) {
                    await Midia.findOrCreate({ where: { idProduto: produto.codProduto, tipo: 'REVIEW' }, defaults: { url: `https://www.youtube.com/watch?v=${review[1]}`, titulo: `Review de ${produto.nome}`, credito: 'Vídeo independente no YouTube', ordem: 0 }, transaction })
                    for (let n = 1; n <= 4; n++) {
                        const arquivo = review[2] === 'megablast' && n === 1 ? 'megablast' : review[2] === 'supercomp' && n === 1 ? 'supercomp' : review[2] === 'vaporfly' && n === 2 ? 'vaporfl2' : review[2] + n
                        await Midia.findOrCreate({ where: { idProduto: produto.codProduto, tipo: 'IMAGEM', ordem: n }, defaults: { url: `../../imagens/${arquivo}.${review[3]}`, titulo: `${produto.nome} - Foto ${n}` }, transaction })
                    }
                }
            }
            await Migracao.create({ nome }, { transaction })
        })
        }
        const segunda = '20261027-pedidos-legados-demo'
        if (!await Migracao.findByPk(segunda)) await db.transaction(async transaction => {
            for (const pedido of await Pedido.findAll({ transaction })) {
                const status = pedido.status === 'CANCELADO' ? 'CANCELADO' : pedido.status === 'PENDENTE' ? 'PENDENTE' : 'APROVADO'
                await Pagamento.findOrCreate({ where: { idPedido: pedido.codPedido }, defaults: { provedor: 'demonstracao', valor: pedido.valorTotal, status }, transaction })
                if (pedido.status === 'PENDENTE') await Reserva.findOrCreate({ where: { idPedido: pedido.codPedido }, defaults: { status: 'ATIVA', expira_em: new Date(Date.now() + 24 * 60 * 60000) }, transaction })
                for (const item of await ItemPedido.findAll({ where: { idPedido: pedido.codPedido }, transaction })) {
                    const produto = await Produto.findByPk(item.idProduto, { transaction })
                    if (produto && !item.nome_produto) await item.update({ nome_produto: produto.nome, imagem_produto: produto.imagem_url }, { transaction })
                }
            }
            await Migracao.create({ nome: segunda }, { transaction })
        })
        const terceira = '20261027-marcas-relacionais'
        if (!await Migracao.findByPk(terceira)) await db.transaction(async transaction => {
            for (const produto of await Produto.findAll({ transaction })) {
                const marca = await Marca.findOne({ where: { nome: produto.marca || '' }, transaction })
                if (marca) await produto.update({ idMarca: marca.codMarca, marca: marca.nome }, { transaction })
            }
            await Migracao.create({ nome: terceira }, { transaction })
        })
        const referenciasItens = await db.getQueryInterface().getForeignKeyReferencesForTable('itens_pedido')
        if (!referenciasItens.some(ref => ref.columnName === 'idVariante')) await db.getQueryInterface().addConstraint('itens_pedido', {
            fields: ['idVariante'], type: 'foreign key', name: 'fk_itens_variante', references: { table: 'produto_variantes', field: 'codVariante' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE'
        })
    } finally {
        if (locked) await connection.promise().query("SELECT RELEASE_LOCK('sportkicks-migrations-v1')")
        await db.connectionManager.releaseConnection(connection)
    }
}
if (require.main === module) migrar().then(() => console.log('Migrações aplicadas.')).catch(err => { console.error(err.message); process.exitCode = 1 }).finally(() => db.close())
module.exports = { migrar }
