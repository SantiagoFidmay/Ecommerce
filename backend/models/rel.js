const Usuario = require('./Usuario')
const Pedido = require('./Pedido')
const Produto = require('./Produto')
const ItemPedido = require('./ItemPedido')
const Entrega = require('./Entrega')
const Estoque = require('./Estoque')
const Categoria = require('./Categoria')
const evolucao = require('./evolucao')


// 1. RELACIONAMENTOS CATEGORIA & PRODUTO
Categoria.hasMany(Produto, {
    foreignKey: 'idCategoria',
    as: 'produtosCategoria',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
})

Produto.belongsTo(Categoria, {
    foreignKey: 'idCategoria',
    as: 'categoriaProduto'
})


// 2. RELACIONAMENTOS USUÁRIO & PEDIDO
Usuario.hasMany(Pedido, {
    foreignKey: 'idUsuario',
    as: 'pedidosUsuario',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
})

Pedido.belongsTo(Usuario, {
    foreignKey: 'idUsuario',
    as: 'usuarioPedido'
})


// 3. RELACIONAMENTOS PEDIDO (ITEM_PEDIDO E ENTREGA)
Pedido.hasMany(ItemPedido, {
    foreignKey: 'idPedido',
    as: 'itensPedido',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
})

ItemPedido.belongsTo(Pedido, {
    foreignKey: 'idPedido',
    as: 'pedidoItem'
})

Pedido.hasOne(Entrega, {
    foreignKey: 'idPedido',
    as: 'entregaPedido',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
})

Entrega.belongsTo(Pedido, {
    foreignKey: 'idPedido',
    as: 'pedidoEntrega'
})


// 4. RELACIONAMENTOS PRODUTO (ITEM_PEDIDO E ESTOQUE)
Produto.hasMany(ItemPedido, {
    foreignKey: 'idProduto',
    as: 'itensProduto',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
})

ItemPedido.belongsTo(Produto, {
    foreignKey: 'idProduto',
    as: 'produtoItem'
})

Produto.hasOne(Estoque, {
    foreignKey: 'idProduto',
    as: 'estoqueProduto',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
})

Estoque.belongsTo(Produto, {
    foreignKey: 'idProduto',
    as: 'produtoEstoque'
})


Produto.hasMany(evolucao.Variante, { foreignKey: 'idProduto', as: 'variantes', onDelete: 'RESTRICT' })
Produto.belongsTo(evolucao.Marca, { foreignKey: 'idMarca', as: 'marcaProduto', onDelete: 'RESTRICT' })
evolucao.Variante.belongsTo(Produto, { foreignKey: 'idProduto', as: 'produto' })
Produto.hasMany(evolucao.Midia, { foreignKey: 'idProduto', as: 'midias', onDelete: 'CASCADE' })
Produto.hasOne(evolucao.Ficha, { foreignKey: 'idProduto', as: 'fichaTecnica', onDelete: 'CASCADE' })
for (const model of [evolucao.HistoricoPreco, evolucao.Movimento, evolucao.Favorito, evolucao.Avaliacao, evolucao.Rotacao]) {
    model.belongsTo(Produto, { foreignKey: 'idProduto', as: 'produto', onDelete: 'RESTRICT' })
}
for (const model of [evolucao.Favorito, evolucao.Alerta, evolucao.Notificacao, evolucao.Avaliacao, evolucao.Rotacao, evolucao.Sessao, evolucao.Recuperacao, evolucao.Seguranca, evolucao.CheckoutChave]) {
    model.belongsTo(Usuario, { foreignKey: 'idUsuario', as: 'usuario', onDelete: 'CASCADE' })
}
evolucao.Alerta.belongsTo(evolucao.Variante, { foreignKey: 'idVariante', as: 'variante', onDelete: 'RESTRICT' })
evolucao.Pagamento.belongsTo(Pedido, { foreignKey: 'idPedido', as: 'pedido', onDelete: 'RESTRICT' })
Pedido.hasOne(evolucao.Pagamento, { foreignKey: 'idPedido', as: 'pagamentoPedido' })
Pedido.hasOne(evolucao.Reserva, { foreignKey: 'idPedido', as: 'reservaPedido' })
evolucao.EventoPagamento.belongsTo(evolucao.Pagamento, { foreignKey: 'idPagamento', onDelete: 'RESTRICT' })
ItemPedido.belongsTo(evolucao.Variante, { foreignKey: 'idVariante', as: 'varianteItem', onDelete: 'RESTRICT' })

module.exports = {
    ...evolucao,
    Usuario,
    Pedido,
    Produto,
    ItemPedido,
    Entrega,
    Estoque,
    Categoria
}
