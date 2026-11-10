const Usuario = require('./Usuario')
const Pedido = require('./Pedido')
const Produto = require('./Produto')
const ItemPedido = require('./ItemPedido')
const Entrega = require('./Entrega')
const Estoque = require('./Estoque')
const Categoria = require('./Categoria')
const Marca = require('./Marca')
const Variante = require('./Variante')
const Midia = require('./Midia')
const Ficha = require('./Ficha')
const HistoricoPreco = require('./HistoricoPreco')
const Movimento = require('./Movimento')
const CheckoutChave = require('./CheckoutChave')
const Reserva = require('./Reserva')
const Pagamento = require('./Pagamento')
const EventoPagamento = require('./EventoPagamento')
const Favorito = require('./Favorito')
const Alerta = require('./Alerta')
const Notificacao = require('./Notificacao')
const Avaliacao = require('./Avaliacao')
const Rotacao = require('./Rotacao')
const Seguranca = require('./Seguranca')
const Sessao = require('./Sessao')
const Recuperacao = require('./Recuperacao')
const Migracao = require('./Migracao')


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


Produto.hasMany(Variante, {
    foreignKey: 'idProduto',
    as: 'variantes',
    onDelete: 'RESTRICT'
})
Produto.belongsTo(Marca, {
    foreignKey: 'idMarca',
    as: 'marcaProduto',
    onDelete: 'RESTRICT'
})
Variante.belongsTo(Produto, {
    foreignKey: 'idProduto',
    as: 'produto'
})
Produto.hasMany(Midia, {
    foreignKey: 'idProduto',
    as: 'midias',
    onDelete: 'CASCADE'
})
Produto.hasOne(Ficha, {
    foreignKey: 'idProduto',
    as: 'fichaTecnica',
    onDelete: 'CASCADE'
})
for (const model of [HistoricoPreco, Movimento, Favorito, Avaliacao, Rotacao]) {
    model.belongsTo(Produto, {
        foreignKey: 'idProduto',
        as: 'produto',
        onDelete: 'RESTRICT'
    })
}
for (const model of [Favorito, Alerta, Notificacao, Avaliacao, Rotacao, Sessao, Recuperacao, Seguranca, CheckoutChave]) {
    model.belongsTo(Usuario, {
        foreignKey: 'idUsuario',
        as: 'usuario',
        onDelete: 'CASCADE'
    })
}
Alerta.belongsTo(Variante, {
    foreignKey: 'idVariante',
    as: 'variante',
    onDelete: 'RESTRICT'
})
Pagamento.belongsTo(Pedido, {
    foreignKey: 'idPedido',
    as: 'pedido',
    onDelete: 'RESTRICT'
})
Pedido.hasOne(Pagamento, {
    foreignKey: 'idPedido',
    as: 'pagamentoPedido'
})
Pedido.hasOne(Reserva, {
    foreignKey: 'idPedido',
    as: 'reservaPedido'
})
EventoPagamento.belongsTo(Pagamento, {
    foreignKey: 'idPagamento',
    onDelete: 'RESTRICT'
})
ItemPedido.belongsTo(Variante, {
    foreignKey: 'idVariante',
    as: 'varianteItem',
    onDelete: 'RESTRICT'
})
module.exports = {
    Marca,
    Variante,
    Midia,
    Ficha,
    HistoricoPreco,
    Movimento,
    CheckoutChave,
    Reserva,
    Pagamento,
    EventoPagamento,
    Favorito,
    Alerta,
    Notificacao,
    Avaliacao,
    Rotacao,
    Seguranca,
    Sessao,
    Recuperacao,
    Migracao,
    Usuario,
    Pedido,
    Produto,
    ItemPedido,
    Entrega,
    Estoque,
    Categoria
}
