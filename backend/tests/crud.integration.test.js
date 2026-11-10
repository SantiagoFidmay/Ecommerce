const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
let a, sequencia = 0
before(async () => { a = await require('./helpers/app').ambiente() })
after(async () => { if (a) await a.fechar() })
const admin = (rota, metodo = 'GET', dados) => a.request(rota, a.tokens.gestor, metodo, dados)
const conferir = (res, status = 200) => { assert.equal(res.status, status, JSON.stringify(res.dados)); return res.dados }

async function comprar(quantidade = 1) {
    const produto = await a.models.Produto.create({ nome: `Produto CRUD ${++sequencia}`, preco: 100, marca: 'Adidas', idCategoria: a.categoria.codCategoria })
    await a.models.Estoque.create({ idProduto: produto.codProduto, quantidade: 5 })
    const variante = await a.models.Variante.create({ idProduto: produto.codProduto, sku: `CRUD-${sequencia}`, tamanho: '40', cor: 'Branco', quantidade: 5 })
    const dados = conferir(await a.request('/pedidos', a.tokens.cliente, 'POST', { forma_pagamento: 'PIX', itens: [{ idProduto: produto.codProduto, idVariante: variante.codVariante, quantidade }] }), 201)
    const pedido = await a.models.Pedido.findByPk(dados.pedido.id)
    const item = await a.models.ItemPedido.findOne({ where: { idPedido: pedido.codPedido } })
    return { produto, variante, pedido, item }
}
const saldo = async c => (await c.variante.reload()).quantidade
const linha = (c, quantidade) => ({ idProduto: c.produto.codProduto, idVariante: c.variante.codVariante, quantidade })

test('novas rotas administrativas rejeitam visitante e cliente, antes de consultar ou alterar dados', async () => {
    const rotas = [
        ['POST', '/admin/pedidos'], ['GET', '/admin/produtos/1'],
        ['GET', '/usuarios/buscar?nome=Cliente'], ['GET', '/categorias/buscar?nome=Corrida'],
        ['GET', '/estoque/buscar?nome=Modelo'], ['GET', '/estoque/1'], ['PATCH', '/estoque/1'], ['DELETE', '/estoque/1'],
        ['GET', '/pedidos/buscar?nome=Cliente'], ['PUT', '/pedidos/1'], ['PATCH', '/pedidos/1'], ['DELETE', '/pedidos/1'],
        ['GET', '/entregas/buscar?nome=Cliente'], ['GET', '/entregas/1'], ['POST', '/entregas'], ['PUT', '/entregas/1'], ['PATCH', '/entregas/1'], ['DELETE', '/entregas/1'],
        ['GET', '/itens-pedido'], ['GET', '/itens-pedido/1'], ['GET', '/itens-pedido/buscar?nome=Modelo'], ['POST', '/itens-pedido'], ['PUT', '/itens-pedido/1'], ['PATCH', '/itens-pedido/1'], ['DELETE', '/itens-pedido/1']
    ]
    for (const [metodo, rota] of rotas) {
        const body = ['POST', 'PUT', 'PATCH'].includes(metodo) ? {} : undefined
        assert.equal((await a.request(rota, null, metodo, body)).status, 401, rota)
        assert.equal((await a.request(rota, a.tokens.cliente, metodo, body)).status, 403, rota)
    }
})

test('buscas por nome retornam categorias, usuários sem senha e estoque pelo produto', async () => {
    assert.equal(conferir(await admin('/categorias/buscar/Corrida')).total, 1)
    const usuarios = conferir(await admin('/usuarios/buscar?nome=Cliente'))
    assert.equal(usuarios.total, 2)
    assert.equal(usuarios.usuarios.some(u => 'senha' in u), false)
    assert.equal(conferir(await admin('/estoque/buscar/Modelo')).total, 1)
    assert.equal((await admin('/usuarios/buscar')).status, 400)
})

test('PUT de categoria substitui opcionais, PATCH preserva e produtos ativos impedem desativação', async () => {
    const categoria = conferir(await admin('/categorias', 'POST', { nome: 'Categoria CRUD', descricao: 'Descrição anterior', icone: 'teste' }), 201).categoria
    conferir(await admin(`/categorias/${categoria.codCategoria}`, 'PATCH', { nome: 'Categoria Parcial' }))
    assert.equal((await a.models.Categoria.findByPk(categoria.codCategoria)).descricao, 'Descrição anterior')
    conferir(await admin(`/categorias/${categoria.codCategoria}`, 'PUT', { nome: 'Categoria Completa' }))
    assert.equal((await a.models.Categoria.findByPk(categoria.codCategoria)).descricao, null)
    assert.equal((await admin(`/categorias/${categoria.codCategoria}`, 'PUT', { icone: 'teste' })).status, 400)
    conferir(await admin(`/categorias/${categoria.codCategoria}`, 'DELETE'))
    assert.equal((await a.models.Categoria.findByPk(categoria.codCategoria)).ativo, false)
    assert.equal((await admin(`/categorias/${a.categoria.codCategoria}`, 'DELETE')).status, 409)
})

test('PUT de produto exige campos principais e limpa opcionais, PATCH preserva os demais dados', async () => {
    const produto = conferir(await admin('/produtos', 'POST', { nome: 'Produto Completo', preco: 150, marca: 'Adidas', idCategoria: a.categoria.codCategoria, descricao: 'Original', preco_promocional: 120 }), 201).produto
    conferir(await admin(`/produtos/${produto.codProduto}`, 'PATCH', { nome: 'Produto Parcial' }))
    assert.equal((await a.models.Produto.findByPk(produto.codProduto)).descricao, 'Original')
    assert.equal((await admin(`/produtos/${produto.codProduto}`, 'PUT', { nome: 'Incompleto' })).status, 400)
    conferir(await admin(`/produtos/${produto.codProduto}`, 'PUT', { nome: 'Produto Substituído', preco: 200, marca: 'Adidas', idCategoria: a.categoria.codCategoria }))
    const novo = await a.models.Produto.findByPk(produto.codProduto)
    assert.equal(novo.descricao, '')
    assert.equal(novo.preco_promocional, null)
    assert.equal(novo.codigo_produto, null)
})

test('estoque aceita PUT, PATCH e DELETE com histórico, bloqueando saldo e variantes vinculadas', async () => {
    const produto = await a.models.Produto.create({ nome: 'Estoque CRUD', preco: 100, marca: 'Adidas', idCategoria: a.categoria.codCategoria })
    const estoque = conferir(await admin('/estoque', 'POST', { idProduto: produto.codProduto, quantidade: 0, quantidade_minima: 1 }), 201).estoque
    assert.equal(conferir(await admin(`/estoque/${estoque.codEstoque}`)).idProduto, produto.codProduto)
    conferir(await admin(`/estoque/${estoque.codEstoque}`, 'PUT', { quantidade: 4, quantidade_minima: 2 }))
    conferir(await admin(`/estoque/${estoque.codEstoque}`, 'PATCH', { quantidade_minima: 0 }))
    assert.equal((await a.models.Estoque.findByPk(estoque.codEstoque)).quantidade, 4)
    assert.equal((await admin(`/estoque/${estoque.codEstoque}`, 'DELETE')).status, 409)
    assert.equal((await admin(`/estoque/${estoque.codEstoque}`, 'PUT', { quantidade: 0 })).status, 400)
    conferir(await admin(`/estoque/${estoque.codEstoque}`, 'PATCH', { quantidade: 0 }))
    assert.equal(await a.models.Movimento.count({ where: { idProduto: produto.codProduto } }), 2)
    conferir(await admin(`/estoque/${estoque.codEstoque}`, 'DELETE'))
    assert.equal(await a.models.Estoque.findByPk(estoque.codEstoque), null)
    const vinculado = await a.models.Estoque.findOne({ where: { idProduto: a.produto.codProduto } })
    assert.equal((await admin(`/estoque/${vinculado.codEstoque}`, 'PATCH', { quantidade: 0 })).status, 409)
})

test('pedido possui busca por cliente, PUT e PATCH com estoque e pagamento recalculados', async () => {
    const c = await comprar()
    assert.ok(conferir(await admin('/pedidos/buscar/Cliente')).pedidos.some(p => p.codPedido === c.pedido.codPedido))
    conferir(await admin(`/pedidos/${c.pedido.codPedido}`, 'PATCH', { observacoes: 'Conferir embalagem' }))
    assert.equal(await saldo(c), 4)
    assert.equal((await admin(`/pedidos/${c.pedido.codPedido}`, 'PUT', { observacoes: 'Incompleto' })).status, 400)
    const dados = conferir(await admin(`/pedidos/${c.pedido.codPedido}`, 'PUT', { forma_pagamento: 'BOLETO', observacoes: null, itens: [linha(c, 3)] }))
    assert.equal(await saldo(c), 2)
    assert.equal(Number(dados.pedido.valorSubtotal), 300)
    assert.equal(Number(dados.pedido.valorDesconto), 15)
    assert.equal(Number((await a.models.Pagamento.findOne({ where: { idPedido: c.pedido.codPedido } })).valor), Number(dados.pedido.valorTotal))
    conferir(await admin(`/pedidos/${c.pedido.codPedido}`, 'DELETE'))
    assert.equal(await saldo(c), 5)
})

test('CRUD de itens preserva IDs, reserva estoque e recalcula totais sem aceitar preços enviados', async () => {
    const c = await comprar()
    const criado = conferir(await admin('/itens-pedido', 'POST', { idPedido: c.pedido.codPedido, ...linha(c, 1) }), 201)
    assert.equal(await saldo(c), 3)
    assert.equal(conferir(await admin(`/itens-pedido/${criado.item.codItemPedido}`)).quantidade, 1)
    assert.ok(conferir(await admin(`/itens-pedido/buscar?nome=${encodeURIComponent(c.produto.nome)}`)).total >= 2)
    assert.equal(conferir(await admin(`/itens-pedido?idPedido=${c.pedido.codPedido}`)).total, 2)
    const editado = conferir(await admin(`/itens-pedido/${criado.item.codItemPedido}`, 'PUT', { idPedido: c.pedido.codPedido, ...linha(c, 2) }))
    assert.equal(editado.item.codItemPedido, criado.item.codItemPedido)
    assert.equal(await saldo(c), 2)
    conferir(await admin(`/itens-pedido/${criado.item.codItemPedido}`, 'PATCH', { quantidade: 1 }))
    assert.equal(await saldo(c), 3)
    assert.equal((await admin(`/itens-pedido/${criado.item.codItemPedido}`, 'PATCH', { preco_unitario: 1 })).status, 400)
    conferir(await admin(`/itens-pedido/${criado.item.codItemPedido}`, 'DELETE'))
    assert.equal(await saldo(c), 4)
    assert.equal((await admin(`/itens-pedido/${c.item.codItemPedido}`, 'DELETE')).status, 409)
    conferir(await admin(`/pedidos/${c.pedido.codPedido}`, 'DELETE'))
})

test('saldo insuficiente, reserva expirada e transferência entre pedidos deixam os dados intactos', async () => {
    const c = await comprar(), outro = await comprar()
    const valor = c.pedido.valorTotal
    assert.equal((await admin(`/itens-pedido/${c.item.codItemPedido}`, 'PATCH', { quantidade: 6 })).status, 409)
    assert.equal(await saldo(c), 4)
    assert.equal((await c.item.reload()).quantidade, 1)
    assert.equal((await c.pedido.reload()).valorTotal, valor)
    assert.equal((await admin(`/itens-pedido/${c.item.codItemPedido}`, 'PATCH', { idPedido: outro.pedido.codPedido })).status, 409)
    await a.models.Reserva.update({ expira_em: new Date(Date.now() - 1000) }, { where: { idPedido: c.pedido.codPedido } })
    assert.equal((await admin(`/pedidos/${c.pedido.codPedido}`, 'PATCH', { observacoes: 'Expirado' })).status, 409)
    conferir(await admin(`/pedidos/${c.pedido.codPedido}`, 'DELETE'))
    conferir(await admin(`/pedidos/${outro.pedido.codPedido}`, 'DELETE'))
})

test('edições concorrentes do mesmo item não duplicam baixa de estoque', async () => {
    const c = await comprar()
    const respostas = await Promise.all([admin(`/itens-pedido/${c.item.codItemPedido}`, 'PATCH', { quantidade: 2 }), admin(`/itens-pedido/${c.item.codItemPedido}`, 'PATCH', { quantidade: 3 })])
    respostas.forEach(r => conferir(r))
    assert.equal((await saldo(c)) + (await c.item.reload()).quantidade, 5)
    conferir(await admin(`/pedidos/${c.pedido.codPedido}`, 'DELETE'))
    assert.equal(await saldo(c), 5)
})

test('edição só notifica disponibilidade quando há saldo final e uma falha desfaz a reserva', async t => {
    const c = await comprar(5)
    await a.models.Alerta.create({ idUsuario: a.outro.codUsuario, idVariante: c.variante.codVariante })
    const antes = await a.models.Notificacao.count({ where: { idUsuario: a.outro.codUsuario } })
    conferir(await admin(`/itens-pedido/${c.item.codItemPedido}`, 'PATCH', { quantidade: 5 }))
    assert.equal(await saldo(c), 0)
    assert.equal(await a.models.Notificacao.count({ where: { idUsuario: a.outro.codUsuario } }), antes)
    conferir(await admin(`/itens-pedido/${c.item.codItemPedido}`, 'PATCH', { quantidade: 4 }))
    assert.equal(await saldo(c), 1)
    assert.equal(await a.models.Notificacao.count({ where: { idUsuario: a.outro.codUsuario } }), antes + 1)
    const movimentos = await a.models.Movimento.count({ where: { idProduto: c.produto.codProduto } })
    const simular = t.mock.method(a.models.ItemPedido, 'create', async () => { throw new Error('Falha de gravação simulada') })
    assert.equal((await admin('/itens-pedido', 'POST', { idPedido: c.pedido.codPedido, ...linha(c, 1) })).status, 500)
    simular.mock.restore()
    assert.equal(await saldo(c), 1)
    assert.equal((await c.item.reload()).quantidade, 4)
    assert.equal(await a.models.Movimento.count({ where: { idProduto: c.produto.codProduto } }), movimentos)
    conferir(await admin(`/pedidos/${c.pedido.codPedido}`, 'DELETE'))
})

test('exclusão de pedido remove dependências, mantém movimentos e não repõe estoque duas vezes', async () => {
    const c = await comprar(2)
    conferir(await a.request(`/pedidos/${c.pedido.codPedido}/cancelar`, a.tokens.cliente, 'POST', {}))
    assert.equal(await saldo(c), 5)
    conferir(await admin(`/pedidos/${c.pedido.codPedido}`, 'DELETE'))
    assert.equal(await saldo(c), 5)
    assert.equal(await a.models.Pedido.findByPk(c.pedido.codPedido), null)
    for (const model of [a.models.ItemPedido, a.models.Entrega, a.models.Pagamento, a.models.Reserva, a.models.CheckoutChave]) assert.equal(await model.count({ where: { idPedido: c.pedido.codPedido } }), 0)
    assert.ok(await a.models.Movimento.count({ where: { idProduto: c.produto.codProduto, idPedido: null } }))
    assert.equal((await admin(`/pedidos/${c.pedido.codPedido}`, 'DELETE')).status, 404)
})

test('pedidos pagos não permitem edição de itens ou exclusão', async () => {
    const c = await comprar()
    conferir(await a.request(`/pagamentos/${c.pedido.codPedido}/demonstrar`, a.tokens.cliente, 'POST', { confirmarDemonstracao: true }))
    assert.equal((await admin(`/pedidos/${c.pedido.codPedido}`, 'DELETE')).status, 409)
    assert.equal((await admin(`/itens-pedido/${c.item.codItemPedido}`, 'PATCH', { quantidade: 2 })).status, 409)
    assert.equal((await admin(`/pedidos/${c.pedido.codPedido}`, 'PATCH', { observacoes: 'Pago' })).status, 409)
    assert.equal(await saldo(c), 4)
})

test('entrega possui CRUD com busca por cliente, datas válidas e vínculo imutável ao pedido', async () => {
    const c = await comprar()
    const original = await a.models.Entrega.findOne({ where: { idPedido: c.pedido.codPedido } })
    assert.ok(conferir(await admin('/entregas/buscar/Cliente')).entregas.some(e => e.codEntrega === original.codEntrega))
    assert.equal(conferir(await admin(`/entregas/${original.codEntrega}`)).idPedido, c.pedido.codPedido)
    conferir(await admin(`/entregas/${original.codEntrega}`, 'DELETE'))
    const dados = { idPedido: c.pedido.codPedido, endereco_entrega: 'Rua Nova, 50', cep_entrega: '01001000', transportadora: 'Transportadora de Teste' }
    const entrega = conferir(await admin('/entregas', 'POST', dados), 201).entrega
    assert.equal((await admin('/entregas', 'POST', dados)).status, 409)
    conferir(await admin(`/entregas/${entrega.codEntrega}`, 'PATCH', { observacoes: 'Portaria' }))
    assert.equal((await admin(`/entregas/${entrega.codEntrega}`, 'PATCH', { data_previsao: '2026-02-30' })).status, 400)
    assert.equal((await admin(`/entregas/${entrega.codEntrega}`, 'PATCH', { status: 'ENTREGUE' })).status, 409)
    conferir(await admin(`/entregas/${entrega.codEntrega}`, 'PUT', { idPedido: c.pedido.codPedido, endereco_entrega: 'Rua Completa, 100', status: 'PENDENTE' }))
    assert.equal((await a.models.Entrega.findByPk(entrega.codEntrega)).transportadora, null)
    assert.equal((await admin(`/entregas/${entrega.codEntrega}`, 'PUT', { endereco_entrega: 'Incompleto' })).status, 400)
    assert.equal((await admin(`/entregas/${entrega.codEntrega}`, 'PATCH', { idPedido: 2147483647 })).status, 409)
    conferir(await admin(`/pedidos/${c.pedido.codPedido}`, 'DELETE'))
})

test('entrega enviada não pode ser excluída e conclusão sincroniza o pedido', async () => {
    const c = await comprar()
    for (const status of ['CONFIRMADO', 'EM_SEPARACAO', 'ENVIADO']) conferir(await admin(`/pedidos/${c.pedido.codPedido}/status`, 'PATCH', { status }))
    const entrega = await a.models.Entrega.findOne({ where: { idPedido: c.pedido.codPedido } })
    assert.equal((await admin(`/entregas/${entrega.codEntrega}`, 'DELETE')).status, 409)
    conferir(await admin(`/entregas/${entrega.codEntrega}`, 'PATCH', { status: 'ENTREGUE' }))
    assert.equal((await c.pedido.reload()).status, 'ENTREGUE')
    assert.equal((await admin(`/entregas/${entrega.codEntrega}`, 'PATCH', { status: 'PENDENTE' })).status, 409)
})

test('IDs inválidos e registros ausentes retornam erro sem alterar o banco', async () => {
    for (const entidade of ['estoque', 'entregas', 'itens-pedido']) {
        assert.equal((await admin(`/${entidade}/abc`)).status, 400)
        assert.equal((await admin(`/${entidade}/2147483647`)).status, 404)
    }
})
