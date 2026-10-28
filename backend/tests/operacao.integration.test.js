const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
let a
before(async () => { a = await require('./helpers/app').ambiente() })
after(async () => { if (a) await a.fechar() })
const api = (rota, method = 'GET', body, gestor = false) => a.request(rota, gestor ? a.tokens.gestor : a.tokens.cliente, method, body)
const saldo = async () => (await a.models.Variante.findByPk(a.variante.codVariante)).quantidade
const comprar = (extras = {}) => api('/pedidos', 'POST', { itens: [{ idProduto: a.produto.codProduto, idVariante: a.variante.codVariante, quantidade: 1 }], forma_pagamento: 'PIX', chaveCheckout: crypto.randomUUID(), ...extras })

test('painel e operações de estoque exigem ADMIN', async () => {
    assert.equal((await a.request('/admin/produtos')).status, 401)
    assert.equal((await api('/admin/produtos')).status, 403)
    assert.equal((await api('/admin/produtos', 'GET', undefined, true)).status, 200)
    assert.equal((await api(`/admin/variantes/${a.variante.codVariante}/movimentos`, 'POST', { tipo: 'ENTRADA', quantidade: 10, motivo: 'teste' })).status, 403)
})

test('catálogo público retorna opções, review e informações desconhecidas sem inventar ficha', async () => {
    const res = await api(`/produtos/${a.produto.codProduto}`)
    assert.equal(res.status, 200)
    assert.equal(res.dados.variantes[0].tamanho, '40')
    assert.equal(res.dados.midias[0].tipo, 'REVIEW')
    assert.equal(res.dados.avaliacoes.total, 0)
    assert.equal(res.dados.fichaTecnica, null)
})

test('SKU, tamanho e cor não podem consumir saldo de outra opção', async () => {
    assert.equal((await comprar({ itens: [{ idProduto: a.produto.codProduto, idVariante: 99999, quantidade: 1 }] })).status, 409)
    assert.equal((await comprar({ itens: [{ idProduto: a.produto.codProduto, quantidade: 1 }] })).status, 409)
    assert.equal(await saldo(), 5)
})

test('confirmações concorrentes com a mesma chave criam um só pedido e uma única baixa', async () => {
    const chaveCheckout = crypto.randomUUID()
    const res = await Promise.all([comprar({ chaveCheckout }), comprar({ chaveCheckout })])
    assert.deepEqual(res.map(r => r.status).sort(), [200, 201])
    assert.equal(res[0].dados.pedido.id, res[1].dados.pedido.id)
    assert.equal(await a.models.Pedido.count(), 1)
    assert.equal(await saldo(), 4)
    const movimento = await a.models.Movimento.findAll({ where: { tipo: 'VENDA' } })
    assert.equal(movimento.length, 1)
    assert.equal((await comprar({ chaveCheckout, forma_pagamento: 'BOLETO' })).status, 409)
    const pedido = res[0].dados.pedido.id
    const cancelamentos = await Promise.all([api(`/pedidos/${pedido}/cancelar`, 'POST', {}), api(`/pedidos/${pedido}/cancelar`, 'POST', {})])
    assert.equal(cancelamentos.every(r => r.status === 200), true)
    assert.equal(await saldo(), 5)
})

test('reservas vencidas devolvem o saldo uma única vez', async () => {
    const venda = await comprar()
    assert.equal(venda.status, 201)
    await a.models.Reserva.update({ expira_em: new Date(Date.now()-1000) }, { where: { idPedido: venda.dados.pedido.id } })
    const expirar = require('../services/pedido.service').expirarReservas
    const contagens = await Promise.all([expirar(), expirar()])
    assert.equal(contagens.reduce((n,v)=>n+v,0), 1)
    assert.equal(await saldo(), 5)
    assert.equal((await api(`/pagamentos/${venda.dados.pedido.id}/demonstrar`, 'POST', { confirmarDemonstracao: true })).status, 409)
})

test('pagamento e estorno são somente demonstração, com confirmação explícita e saldo consistente', async () => {
    const venda = await comprar(); const codigo = venda.dados.pedido.id
    assert.equal((await api(`/pagamentos/${codigo}/demonstrar`, 'POST', {})).status, 400)
    assert.equal((await a.request(`/pagamentos/${codigo}/demonstrar`, a.tokens.outro, 'POST', { confirmarDemonstracao: true })).status, 404)
    const pago = await api(`/pagamentos/${codigo}/demonstrar`, 'POST', { confirmarDemonstracao: true })
    assert.equal(pago.status, 200); assert.equal(pago.dados.cobranca_real, false)
    assert.equal((await api(`/pagamentos/${codigo}/demonstrar`, 'POST', { confirmarDemonstracao: true })).status, 200)
    assert.equal((await a.models.Pedido.findByPk(codigo)).status, 'CONFIRMADO')
    assert.equal((await api(`/pedidos/${codigo}/cancelar`, 'POST', {})).status, 409)
    assert.equal((await api(`/pagamentos/${codigo}/reembolsar-demo`, 'POST', { confirmarDemonstracao: true })).status, 403)
    const estorno = await api(`/pagamentos/${codigo}/reembolsar-demo`, 'POST', { confirmarDemonstracao: true }, true)
    assert.equal(estorno.status, 200)
    assert.equal(estorno.dados.pagamento.status, 'REEMBOLSADO')
    assert.equal(await saldo(), 5)
    assert.equal((await a.models.Pedido.findByPk(codigo)).status, 'CANCELADO')
})

test('movimentações e transferência preservam total e rejeitam saída sem saldo', async () => {
    const nova = await api(`/admin/produtos/${a.produto.codProduto}/variantes`, 'POST', { tamanho: '41', cor: 'Branco', sku: 'TESTE-41-BRANCO' }, true)
    assert.equal(nova.status, 201)
    const destino = nova.dados.variante.codVariante
    const mover = dados => api(`/admin/variantes/${a.variante.codVariante}/movimentos`, 'POST', dados, true)
    assert.equal((await mover({ tipo: 'SAIDA', quantidade: -1, motivo: 'inválido' })).status, 400)
    assert.equal((await mover({ tipo: 'SAIDA', quantidade: 99, motivo: 'sem saldo' })).status, 409)
    assert.equal((await mover({ tipo: 'TRANSFERENCIA', quantidade: 2, destino, motivo: 'Separação por numeração' })).status, 200)
    assert.equal(await saldo(), 3)
    assert.equal((await a.models.Variante.findByPk(destino)).quantidade, 2)
    assert.equal((await a.models.Estoque.findOne({ where: { idProduto: a.produto.codProduto } })).quantidade, 5)
})

test('alertas geram aviso na conta quando a opção volta ao estoque', async () => {
    const mover = dados => api(`/admin/variantes/${a.variante.codVariante}/movimentos`, 'POST', dados, true)
    await mover({ tipo: 'AJUSTE', quantidade: 0, motivo: 'Contagem física de teste' })
    assert.equal((await api(`/comunidade/alertas/${a.variante.codVariante}`, 'PUT', {})).status, 200)
    await mover({ tipo: 'ENTRADA', quantidade: 3, motivo: 'Reposição de teste' })
    const avisos = await api('/comunidade/notificacoes')
    assert.equal(avisos.dados.notificacoes.some(n => n.titulo === 'Seu tamanho voltou!'), true)
    const alheios = await a.request('/comunidade/notificacoes', a.tokens.outro)
    assert.equal(alheios.dados.notificacoes.length, 0)
    assert.equal((await api('/comunidade/alertas')).dados.alertas.length, 0)
})

test('favoritos e rotação são persistidos por usuário sem duplicações', async () => {
    for (let i=0;i<2;i++) assert.equal((await api(`/comunidade/favoritos/${a.produto.codProduto}`, 'PUT', {})).status, 200)
    assert.equal((await api('/comunidade/favoritos')).dados.favoritos.length, 1)
    assert.equal((await a.request('/comunidade/favoritos', a.tokens.outro)).dados.favoritos.length, 0)
    assert.equal((await api(`/comunidade/rotacao/${a.produto.codProduto}`, 'PUT', { uso: 'DIARIO' })).status, 200)
    assert.equal((await api('/comunidade/rotacao')).dados.rotacao[0].uso, 'DIARIO')
})

test('avaliação exige compra entregue e bloqueia duplicação; relatórios refletem pedidos confirmados', async () => {
    const venda = await comprar(), codigo = venda.dados.pedido.id
    const avaliar = () => api(`/comunidade/produtos/${a.produto.codProduto}/avaliacoes`, 'POST', { idPedido: codigo, nota: 5, ajuste: 'ADEQUADO', comentario: 'Ajustou bem no uso de teste.' })
    assert.equal((await avaliar()).status, 403)
    await api(`/pagamentos/${codigo}/demonstrar`, 'POST', { confirmarDemonstracao: true })
    for (const status of ['EM_SEPARACAO', 'ENVIADO', 'ENTREGUE']) assert.equal((await api(`/pedidos/${codigo}/status`, 'PATCH', { status }, true)).status, 200)
    assert.equal((await avaliar()).status, 201)
    assert.equal((await avaliar()).status, 409)
    assert.equal((await api(`/produtos/${a.produto.codProduto}`)).dados.avaliacoes.media, 5)
    for (const rota of ['dashboard', 'vendas', 'faturamento', 'estoque']) assert.equal((await api('/relatorios/' + rota, 'GET', undefined, true)).status, 200)
    assert.equal((await api('/relatorios/faturamento?inicio=2026-99-01', 'GET', undefined, true)).status, 400)
})

test('cadastro de produto valida preço, mídia e fonte técnica e registra histórico real', async () => {
    assert.equal((await api(`/admin/produtos/${a.produto.codProduto}`, 'PATCH', { preco: -10 }, true)).status, 400)
    assert.equal((await api(`/admin/produtos/${a.produto.codProduto}`, 'PATCH', { midias: [{ tipo:'REVIEW', url:'javascript:alert(1)' }] }, true)).status, 400)
    assert.equal((await api(`/admin/produtos/${a.produto.codProduto}`, 'PATCH', { ficha: { peso_g: 200 } }, true)).status, 400)
    assert.equal((await api(`/admin/produtos/${a.produto.codProduto}`, 'PATCH', { preco: 110, ficha: { finalidades: ['DIARIO'], fonte: 'https://www.adidas.com.br/' } }, true)).status, 200)
    assert.equal((await api(`/produtos/${a.produto.codProduto}`)).dados.historicoPrecos.length, 1)
    const quiz = await api('/comunidade/recomendar?orcamento=120&uso=DIARIO')
    assert.equal(quiz.status, 200)
    assert.equal(quiz.dados.resultados[0].produto.codProduto, a.produto.codProduto)
    assert.equal((await api('/comunidade/marcas')).dados.marcas.length, 5)
})

test('migração pode ser repetida sem recarregar estoque nem duplicar preços', async () => {
    const antes = await saldo(), precos = await a.models.HistoricoPreco.count()
    await require('../migrations').migrar()
    await require('../migrations').migrar()
    assert.equal(await saldo(), antes)
    assert.equal(await a.models.HistoricoPreco.count(), precos)
})

test('período e agrupamento dos relatórios respeitam o dia em São Paulo', async () => {
    await a.models.Pedido.create({ idUsuario:a.cliente.codUsuario, status:'CONFIRMADO', dataPedido:'2026-02-01T01:00:00Z', valorTotal:123 })
    const res=await api('/relatorios/faturamento?inicio=2026-01-31&fim=2026-01-31','GET',undefined,true)
    assert.equal(res.status,200)
    assert.equal(res.dados.dados[0].mes,'2026-01')
    assert.equal(Number(res.dados.dados[0].faturamento),123)
})

test('acesso administrativo rejeita campos extras e protege o administrador atual', async () => {
    const rota=`/admin/usuarios/${a.gestor.codUsuario}/acesso`
    assert.equal((await api(rota,'PATCH',{ativo:false,tipo_usuario:'CLIENTE'},true)).status,409)
    assert.equal((await api(rota,'PATCH',{ativo:true,tipo_usuario:'ADMIN',senha:'intrusao'},true)).status,400)
    assert.equal((await api(`/usuarios/${a.gestor.codUsuario}`,'DELETE',undefined,true)).status,409)
    assert.equal((await a.models.Usuario.findByPk(a.gestor.codUsuario)).ativo,true)
})

test('carga de demonstração só adiciona modelos ausentes e preserva o saldo em uso', async () => {
    const antes=await saldo()
    const {seedDemo}=require('../scripts/seed-demo')
    assert.equal(await seedDemo(),18)
    const total=await a.models.Produto.count()
    assert.equal(await seedDemo(),0)
    assert.equal(await a.models.Produto.count(),total)
    assert.equal(await saldo(),antes)
})

test('logout revoga o JWT no servidor', async () => {
    const token = await a.login(a.outro.email)
    assert.equal((await a.request('/auth/logout', token, 'POST', {})).status, 200)
    assert.equal((await a.request('/usuarios/perfil', token)).status, 401)
})

test('recuperação usa token de uso único e encerra as sessões anteriores', async t => {
    process.env.SMTP_HOST='smtp.example.test'; process.env.SMTP_USER='fixture'; process.env.SMTP_PASS='fixture'; process.env.SMTP_FROM='loja@example.test'; process.env.FRONTEND_URL='https://loja.example.test/'
    let mensagem
    t.mock.method(require('../routes/seguranca.routes').mail, 'enviar', async dados => { mensagem = dados })
    const tokenAntigo = await a.login(a.outro.email)
    assert.equal((await a.request('/auth/recuperar', null, 'POST', { email: a.outro.email })).status, 200)
    const token = mensagem.text.match(/recuperar\.html#([a-f0-9]{64})/)[1]
    const res = await a.request('/auth/redefinir', null, 'POST', { token, senha: 'NovaSenhaTeste123' })
    assert.equal(res.status, 200)
    assert.equal((await a.request('/auth/redefinir', null, 'POST', { token, senha: 'NovaSenhaTeste123' })).status, 400)
    assert.equal((await a.request('/usuarios/perfil', tokenAntigo)).status, 401)
    assert.ok(await a.login(a.outro.email, 'NovaSenhaTeste123'))
})
