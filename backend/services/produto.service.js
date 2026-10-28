const db = require('../db/conn')
const { Produto, Categoria, Marca, Estoque, Variante, Midia, Ficha, HistoricoPreco } = require('../models/rel')
const { falhar, texto, youtube, urlPublica, id } = require('../utils/api.util')

function validarFicha(ficha) {
    if (!ficha || typeof ficha !== 'object' || Array.isArray(ficha)) falhar(400, 'Ficha técnica inválida.')
    const campos = ['peso_g', 'drop_mm', 'placa', 'finalidades', 'superficie', 'amortecimento', 'fonte']
    if (Object.keys(ficha).some(campo => !campos.includes(campo))) falhar(400, 'Campo de ficha técnica não reconhecido.')
    const dados = {}
    for (const [campo, max] of [['peso_g', 2000], ['drop_mm', 30]]) if (ficha[campo] != null && ficha[campo] !== '') {
        if (typeof ficha[campo] !== 'number' || !Number.isFinite(ficha[campo]) || ficha[campo] < 0 || ficha[campo] > max) falhar(400, `${campo} inválido.`)
        dados[campo] = ficha[campo]
    }
    if (ficha.placa != null) { if (typeof ficha.placa !== 'boolean') falhar(400, 'Placa deve ser sim, não ou não informado.'); dados.placa = ficha.placa }
    if (ficha.finalidades != null) {
        if (!Array.isArray(ficha.finalidades) || ficha.finalidades.some(v => !['DIARIO', 'VELOCIDADE', 'PROVA', 'ACADEMIA'].includes(v))) falhar(400, 'Finalidade inválida.')
        dados.finalidades = [...new Set(ficha.finalidades)]
    }
    for (const campo of ['superficie', 'amortecimento']) if (ficha[campo]) dados[campo] = texto(ficha[campo], 80)
    if (Object.keys(dados).length) {
        if (!ficha.fonte) falhar(400, 'Informe a fonte oficial dos dados técnicos.')
        let fonte
        try { fonte = new URL(ficha.fonte) } catch { falhar(400, 'Fonte da ficha inválida.') }
        const dominios = ['adidas.com.br','adidas.com','asics.com.br','asics.com','newbalance.com.br','newbalance.com','nike.com.br','nike.com','olympikus.com.br']
        if (fonte.protocol !== 'https:' || !dominios.some(d => fonte.hostname === d || fonte.hostname.endsWith('.' + d))) falhar(400, 'Use uma fonte HTTPS do site oficial de uma das marcas do catálogo.')
        dados.fonte = fonte.href
    }
    return dados
}

async function salvarProduto(body, codigo = null) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) falhar(400, 'Dados de produto inválidos.')
    const dados = {}
    const campos = { nome: 150, descricao: 10000, marca: 80, codigo_produto: 50 }
    const permitidos = [...Object.keys(campos), 'preco', 'preco_promocional', 'imagem_url', 'video_url', 'idCategoria', 'ativo', 'destaque', 'ficha', 'midias']
    if (Object.keys(body).some(c => !permitidos.includes(c))) falhar(400, 'Campo de produto não permitido.')
    for (const [campo, max] of Object.entries(campos)) if (body[campo] !== undefined) dados[campo] = texto(body[campo], max, campo === 'nome')
    for (const campo of ['preco', 'preco_promocional']) if (body[campo] !== undefined) {
        if (campo === 'preco_promocional' && (body[campo] === null || body[campo] === '')) dados[campo] = null
        else {
            const valor = Number(body[campo])
            if (!Number.isFinite(valor) || valor <= 0 || valor > 99999999.99 || Math.abs(valor * 100 - Math.round(valor * 100)) > 0.0001) falhar(400, 'Preço inválido. Use até duas casas decimais.')
            dados[campo] = valor.toFixed(2)
        }
    }
    for (const campo of ['ativo', 'destaque']) if (body[campo] !== undefined) {
        if (typeof body[campo] !== 'boolean') falhar(400, `${campo} inválido.`)
        dados[campo] = body[campo]
    }
    if (body.imagem_url !== undefined) dados.imagem_url = body.imagem_url ? urlPublica(body.imagem_url) : null
    if (body.video_url !== undefined) dados.video_url = body.video_url ? `https://www.youtube.com/watch?v=${youtube(body.video_url)}` : null
    if (body.idCategoria !== undefined) dados.idCategoria = id(body.idCategoria)
    if (!codigo && (!dados.nome || !dados.preco || !dados.idCategoria)) falhar(400, 'Nome, preço e categoria são obrigatórios.')
    const ficha = body.ficha === undefined ? undefined : validarFicha(body.ficha)
    let midias
    if (body.midias !== undefined) {
        if (!Array.isArray(body.midias) || body.midias.length > 20) falhar(400, 'Envie até vinte mídias por produto.')
        midias = body.midias.map((m, ordem) => {
            if (!m || !['IMAGEM', 'REVIEW'].includes(m.tipo)) falhar(400, 'Tipo de mídia inválido.')
            return { tipo: m.tipo, url: m.tipo === 'REVIEW' ? `https://www.youtube.com/watch?v=${youtube(m.url)}` : urlPublica(m.url), titulo: texto(m.titulo || '', 150), credito: texto(m.credito || '', 150), ordem }
        })
    }
    return db.transaction(async transaction => {
        let produto = codigo ? await Produto.findByPk(codigo, { transaction, lock: transaction.LOCK.UPDATE }) : null
        if (codigo && !produto) falhar(404, 'Produto não encontrado.')
        if (dados.marca || produto?.marca) {
            const marca = await Marca.findOne({ where: { nome: dados.marca || produto.marca }, transaction })
            if (!marca) falhar(400, 'Selecione uma das marcas cadastradas.')
            dados.idMarca = marca.codMarca; dados.marca = marca.nome
        } else if (!codigo) falhar(400, 'Selecione a marca do produto.')
        if (dados.idCategoria && !await Categoria.findByPk(dados.idCategoria, { transaction })) falhar(400, 'Categoria inexistente.')
        const preco = Number(dados.preco ?? produto?.preco)
        const promocional = dados.preco_promocional !== undefined ? dados.preco_promocional : produto?.preco_promocional
        if (promocional != null && Number(promocional) >= preco) falhar(400, 'O preço promocional deve ser menor que o preço normal.')
        const anterior = produto ? Number(produto.preco_promocional ?? produto.preco) : null
        if (produto) await produto.update(dados, { transaction })
        else {
            produto = await Produto.create(dados, { transaction })
            await Estoque.create({ idProduto: produto.codProduto, quantidade: 0 }, { transaction })
        }
        const efetivo = Number(produto.preco_promocional ?? produto.preco)
        if (efetivo !== anterior) await HistoricoPreco.create({ idProduto: produto.codProduto, preco: efetivo }, { transaction })
        if (ficha !== undefined) await Ficha.upsert({ idProduto: produto.codProduto, dados: ficha, atualizado_em: new Date() }, { transaction })
        if (midias !== undefined) {
            await Midia.destroy({ where: { idProduto: produto.codProduto }, transaction })
            await Midia.bulkCreate(midias.map(m => ({ ...m, idProduto: produto.codProduto })), { transaction })
        }
        return produto
    })
}

module.exports = { salvarProduto, validarFicha }
