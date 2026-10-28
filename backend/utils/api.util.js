const falhar = (status, mensagem) => { throw Object.assign(new Error(mensagem), { status }) }
const id = valor => {
    if (!/^[1-9]\d*$/.test(String(valor)) || Number(valor) > 2147483647) falhar(400, 'Código inválido.')
    return Number(valor)
}
const texto = (valor, max, obrigatorio = false) => {
    if (typeof valor !== 'string' || valor.length > max || (obrigatorio && !valor.trim())) falhar(400, 'Texto inválido ou acima do limite permitido.')
    return valor.trim()
}
const youtube = valor => {
    if (/^[\w-]{11}$/.test(valor)) return valor
    let url
    try { url = new URL(valor) } catch { falhar(400, 'Informe um link válido do YouTube.') }
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    const codigo = host === 'youtu.be' ? url.pathname.slice(1) : ['youtube.com', 'youtube-nocookie.com'].includes(host)
        ? url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2] : url.searchParams.get('v') : ''
    if (!/^[\w-]{11}$/.test(codigo)) falhar(400, 'Informe um vídeo do YouTube válido.')
    return codigo
}
const urlPublica = valor => {
    const str = texto(valor, 1000, true)
    try { const u = new URL(str); if (['https:', 'http:'].includes(u.protocol)) return u.href } catch { /* caminho local abaixo */ }
    if (/^(?:\.\.\/)*(?:imagens|assets)\/[a-zA-Z0-9_./ -]+$/.test(str) && !str.includes('..', str.lastIndexOf('/') + 1)) return str
    falhar(400, 'Endereço de mídia inválido.')
}
const handler = func => async (req, res) => {
    try { await func(req, res) }
    catch (erro) {
        const status = erro.name === 'SequelizeUniqueConstraintError' ? 409 : erro.status || 500
        if (status === 500) console.error('Falha interna na operação:', erro.name, erro.original?.code || '')
        res.status(status).json({ erro: status === 409 && !erro.status ? 'Já existe um registro com esses dados.' : erro.status ? erro.message : 'Não foi possível concluir a operação.' })
    }
}
module.exports = { falhar, id, texto, youtube, urlPublica, handler }
