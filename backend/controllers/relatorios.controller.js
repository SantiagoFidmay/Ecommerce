const db = require('../db/conn')
const { QueryTypes } = require('sequelize')
const { handler, falhar } = require('../utils/api.util')
function periodo(req) {
    const inicio = req.query.inicio || '2000-01-01', fim = req.query.fim || '2100-12-31'
    for (const data of [inicio, fim]) if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(new Date(data).getTime()) || new Date(data).toISOString().slice(0,10) !== data) falhar(400, 'Período inválido.')
    if (inicio > fim) falhar(400, 'A data inicial deve ser anterior à final.')
    const utc = (data, hora) => new Date(`${data}T${hora}-03:00`).toISOString().slice(0,19).replace('T',' ')
    return { inicio: utc(inicio,'00:00:00'), fim: utc(fim,'23:59:59') }
}
const dashboard = handler(async (req, res) => {
    const replacements = periodo(req)
    const [usuarios] = await db.query('SELECT COUNT(*) total FROM usuarios WHERE ativo=1', { type: QueryTypes.SELECT })
    const [produtos] = await db.query('SELECT COUNT(*) total FROM produtos WHERE ativo=1', { type: QueryTypes.SELECT })
    const [pedidos] = await db.query("SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN status NOT IN ('PENDENTE','CANCELADO') THEN valorTotal ELSE 0 END),0) valor_confirmados, SUM(status='PENDENTE') pendentes FROM pedidos WHERE dataPedido BETWEEN :inicio AND :fim", { replacements, type: QueryTypes.SELECT })
    const [criticos] = await db.query('SELECT COUNT(*) total FROM produto_variantes v JOIN produtos p ON v.idProduto=p.codProduto WHERE v.ativo=1 AND p.ativo=1 AND v.quantidade<=v.quantidade_minima', { type: QueryTypes.SELECT })
    res.json({ usuarios: usuarios.total, produtos: produtos.total, pedidos: pedidos.total, faturamento_total: pedidos.valor_confirmados, estoque_critico: criticos.total, pendentes: pedidos.pendentes || 0, demonstracao: true })
})
const vendasPorCategoria = handler(async (req,res) => {
    const dados = await db.query("SELECT c.nome categoria, COUNT(DISTINCT p.codPedido) total_pedidos, SUM(ip.quantidade) total_itens, SUM(ip.subtotal) faturamento FROM itens_pedido ip JOIN produtos prod ON ip.idProduto=prod.codProduto JOIN categorias c ON prod.idCategoria=c.codCategoria JOIN pedidos p ON ip.idPedido=p.codPedido WHERE p.status NOT IN ('PENDENTE','CANCELADO') AND p.dataPedido BETWEEN :inicio AND :fim GROUP BY c.codCategoria,c.nome ORDER BY faturamento DESC", { replacements: periodo(req), type: QueryTypes.SELECT })
    res.json({ dados, demonstracao: true, metrica: 'Subtotal dos itens em pedidos confirmados, antes do desconto e frete.' })
})
const faturamentoMensal = handler(async (req,res) => {
    const dados = await db.query("SELECT DATE_FORMAT(CONVERT_TZ(dataPedido,'+00:00','-03:00'),'%Y-%m') mes, DATE_FORMAT(CONVERT_TZ(dataPedido,'+00:00','-03:00'),'%Y-%m') mes_label, COUNT(*) total_pedidos, SUM(valorTotal) faturamento, SUM(valorDesconto) descontos_concedidos FROM pedidos WHERE status NOT IN ('PENDENTE','CANCELADO') AND dataPedido BETWEEN :inicio AND :fim GROUP BY DATE_FORMAT(CONVERT_TZ(dataPedido,'+00:00','-03:00'),'%Y-%m') ORDER BY mes", { replacements: periodo(req), type: QueryTypes.SELECT })
    res.json({ dados, demonstracao: true, metrica: 'Valor dos pedidos confirmados. Nenhuma cobrança real.' })
})
const situacaoEstoque = handler(async (req,res) => {
    const dados = await db.query("SELECT p.nome produto,p.marca,c.nome categoria,e.quantidade,e.quantidade_minima,CASE WHEN e.quantidade=0 THEN 'SEM_ESTOQUE' WHEN e.quantidade<=e.quantidade_minima THEN 'CRITICO' WHEN e.quantidade<=e.quantidade_minima*2 THEN 'BAIXO' ELSE 'OK' END situacao FROM estoque e JOIN produtos p ON e.idProduto=p.codProduto JOIN categorias c ON p.idCategoria=c.codCategoria WHERE p.ativo=1 ORDER BY e.quantidade", { type: QueryTypes.SELECT })
    res.json({ dados, resumo: { total: dados.length, sem_estoque: dados.filter(d=>d.situacao==='SEM_ESTOQUE').length, critico: dados.filter(d=>d.situacao==='CRITICO').length, baixo: dados.filter(d=>d.situacao==='BAIXO').length, ok: dados.filter(d=>d.situacao==='OK').length } })
})
module.exports={dashboard,vendasPorCategoria,faturamentoMensal,situacaoEstoque}
