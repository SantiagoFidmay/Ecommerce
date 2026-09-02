const db = require('../db/conn')
const { QueryTypes } = require('sequelize')

// GET /api/relatorios/dashboard (admin)
const dashboard = async (req, res) => {
    try {
        const [usuarios]       = await db.query('SELECT COUNT(*) as total FROM usuarios WHERE ativo = true', { type: QueryTypes.SELECT })
        const [produtos]       = await db.query('SELECT COUNT(*) as total FROM produtos WHERE ativo = true', { type: QueryTypes.SELECT })
        const [pedidos]        = await db.query('SELECT COUNT(*) as total, SUM(valorTotal) as faturamento FROM pedidos WHERE status NOT IN ("CANCELADO")', { type: QueryTypes.SELECT })
        const [estoqueCritico] = await db.query('SELECT COUNT(*) as total FROM estoque WHERE quantidade <= quantidade_minima', { type: QueryTypes.SELECT })

        return res.json({
            usuarios:          usuarios.total,
            produtos:          produtos.total,
            pedidos:           pedidos.total,
            faturamento_total: pedidos.faturamento || 0,
            estoque_critico:   estoqueCritico.total
        })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao gerar dashboard.', detalhe: err.message })
    }
}

// GET /api/relatorios/vendas — Vendas por Categoria (admin)
const vendasPorCategoria = async (req, res) => {
    try {
        const dados = await db.query(`
            SELECT 
                c.nome          AS categoria,
                c.icone,
                COUNT(DISTINCT p.codPedido)  AS total_pedidos,
                SUM(ip.quantidade)           AS total_itens,
                SUM(ip.subtotal)             AS faturamento
            FROM itens_pedido ip
            JOIN produtos prod ON ip.idProduto = prod.codProduto
            JOIN categorias c  ON prod.idCategoria = c.codCategoria
            JOIN pedidos p     ON ip.idPedido = p.codPedido
            WHERE p.status NOT IN ('CANCELADO')
            GROUP BY c.codCategoria, c.nome, c.icone
            ORDER BY faturamento DESC
        `, { type: QueryTypes.SELECT })

        return res.json({ dados })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao gerar relatório de vendas.', detalhe: err.message })
    }
}

// GET /api/relatorios/faturamento — Faturamento Mensal (admin)
const faturamentoMensal = async (req, res) => {
    try {
        const dados = await db.query(`
            SELECT 
                DATE_FORMAT(p.dataPedido, '%Y-%m')   AS mes,
                DATE_FORMAT(p.dataPedido, '%b/%Y')   AS mes_label,
                COUNT(*)                             AS total_pedidos,
                SUM(p.valorTotal)                    AS faturamento,
                SUM(p.valorDesconto)                 AS descontos_concedidos
            FROM pedidos p
            WHERE p.status NOT IN ('CANCELADO')
              AND p.dataPedido >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(p.dataPedido, '%Y-%m')
            ORDER BY mes ASC
        `, { type: QueryTypes.SELECT })

        return res.json({ dados })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao gerar relatório de faturamento.', detalhe: err.message })
    }
}

// GET /api/relatorios/estoque — Situação do Estoque (admin)
const situacaoEstoque = async (req, res) => {
    try {
        const dados = await db.query(`
            SELECT 
                p.nome          AS produto,
                p.marca,
                c.nome          AS categoria,
                e.quantidade,
                e.quantidade_minima,
                CASE 
                    WHEN e.quantidade = 0                            THEN 'SEM_ESTOQUE'
                    WHEN e.quantidade <= e.quantidade_minima         THEN 'CRITICO'
                    WHEN e.quantidade <= e.quantidade_minima * 2     THEN 'BAIXO'
                    ELSE 'OK'
                END AS situacao
            FROM estoque e
            JOIN produtos p    ON e.idProduto   = p.codProduto
            JOIN categorias c  ON p.idCategoria = c.codCategoria
            WHERE p.ativo = true
            ORDER BY e.quantidade ASC
        `, { type: QueryTypes.SELECT })

        const resumo = {
            total:       dados.length,
            sem_estoque: dados.filter(d => d.situacao === 'SEM_ESTOQUE').length,
            critico:     dados.filter(d => d.situacao === 'CRITICO').length,
            baixo:       dados.filter(d => d.situacao === 'BAIXO').length,
            ok:          dados.filter(d => d.situacao === 'OK').length
        }

        return res.json({ resumo, dados })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao gerar relatório de estoque.', detalhe: err.message })
    }
}

module.exports = { dashboard, vendasPorCategoria, faturamentoMensal, situacaoEstoque }
