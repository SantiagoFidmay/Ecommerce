const { Produto, Estoque } = require('../models/rel')
const { calcularDesconto, calcularFrete } = require('../utils/desconto.util')

const falhar = (status, mensagem) => { throw Object.assign(new Error(mensagem), { status }) }

function validarItens(itens) {
    if (!Array.isArray(itens) || itens.length === 0 || itens.length > 100) {
        falhar(400, 'Envie entre 1 e 100 itens no pedido.')
    }
    return itens.map(item => {
        if (!item || !Number.isSafeInteger(item.idProduto) || item.idProduto < 1 ||
            !Number.isSafeInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 999) {
            falhar(400, 'Produto inválido ou quantidade inválida. Use inteiros de 1 a 999.')
        }
        for (const [campo, limite] of [['tamanho', 10], ['cor', 50]]) {
            if (item[campo] != null && (typeof item[campo] !== 'string' || item[campo].length > limite)) {
                falhar(400, `O campo ${campo} é inválido.`)
            }
        }
        // Não aceitar preço, subtotal ou outros campos enviados pelo navegador.
        return { idProduto: item.idProduto, quantidade: item.quantidade,
            tamanho: item.tamanho?.trim() || null, cor: item.cor?.trim() || null }
    })
}

function validarEndereco(endereco) {
    if (!endereco || typeof endereco !== 'object' || Array.isArray(endereco)) {
        falhar(400, 'Informe o endereço de entrega.')
    }
    const dados = {}
    for (const [campo, limite] of [['cep', 10], ['rua', 200], ['numero', 20], ['complemento', 100], ['bairro', 100], ['cidade', 100], ['estado', 2]]) {
        if (endereco[campo] != null && typeof endereco[campo] !== 'string') falhar(400, `Endereço: ${campo} inválido.`)
        dados[campo] = (endereco[campo] || '').trim()
        if ((campo !== 'complemento' && !dados[campo]) || dados[campo].length > limite) {
            falhar(400, `Confira o campo ${campo} do endereço.`)
        }
    }
    dados.cep = dados.cep.replace(/\D/g, '')
    dados.estado = dados.estado.toUpperCase()
    const estados = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')
    if (!/^\d{8}$/.test(dados.cep) || !estados.includes(dados.estado)) falhar(400, 'CEP ou estado inválido.')
    const texto = `${dados.rua}, ${dados.numero}${dados.complemento ? ' - ' + dados.complemento : ''} - ${dados.bairro}, ${dados.cidade}/${dados.estado}`
    if (texto.length > 300) falhar(400, 'O endereço de entrega deve ter até 300 caracteres.')
    return { cep: dados.cep, texto }
}

async function calcularResumo(itens, transaction, bloquear = false) {
    const quantidades = new Map()
    for (const item of itens) quantidades.set(item.idProduto, (quantidades.get(item.idProduto) || 0) + item.quantidade)
    const produtos = new Map()
    // Mesma ordem de bloqueio em todos os pedidos para reduzir deadlocks.
    for (const id of [...quantidades.keys()].sort((a, b) => a - b)) {
        const options = { transaction, ...(bloquear ? { lock: transaction.LOCK.UPDATE } : {}) }
        const produto = await Produto.findByPk(id, options)
        if (!produto || !produto.ativo) falhar(409, 'Um dos produtos não está mais disponível. Revise o carrinho.')
        const estoque = await Estoque.findOne({ where: { idProduto: id }, ...options })
        if (!estoque || estoque.quantidade < quantidades.get(id)) {
            falhar(409, `Estoque insuficiente para ${produto.nome}. Disponível: ${estoque?.quantidade || 0}.`)
        }
        produtos.set(id, produto)
    }
    let subtotalCentavos = 0
    const processados = itens.map(item => {
        const produto = produtos.get(item.idProduto)
        const centavos = Math.round(Number(produto.preco_promocional ?? produto.preco) * 100)
        if (!Number.isSafeInteger(centavos) || centavos <= 0) falhar(409, 'Produto com preço inválido. Entre em contato com a loja.')
        const subtotal = centavos * item.quantidade
        subtotalCentavos += subtotal
        return { ...item, nome: produto.nome, imagem_url: produto.imagem_url, preco: centavos / 100, subtotal: subtotal / 100 }
    })
    if (!Number.isSafeInteger(subtotalCentavos) || subtotalCentavos > 9999999999) falhar(400, 'O pedido excede o valor máximo permitido.')
    const valorSubtotal = subtotalCentavos / 100
    const desconto = calcularDesconto(valorSubtotal, itens.reduce((soma, item) => soma + item.quantidade, 0))
    const valorFrete = calcularFrete(valorSubtotal)
    const valorTotal = Math.round((desconto.totalComDesconto + valorFrete) * 100) / 100
    return { itens: processados, valorSubtotal, valorDesconto: desconto.valor,
        motivo_desconto: desconto.motivo, valorFrete, valorTotal }
}

module.exports = { validarItens, validarEndereco, calcularResumo, falhar }
