const db = require('../db/conn')
const { Usuario } = require('../models/rel')
const { revogarSessoes } = require('./sessao.service')
const { falhar } = require('../utils/api.util')
async function alterarAcesso(codigo, autor, dados) {
    if (typeof dados.ativo !== 'boolean' || !['CLIENTE', 'ADMIN'].includes(dados.tipo_usuario)) falhar(400, 'Acesso inválido.')
    if (Object.keys(dados).some(campo => !['ativo', 'tipo_usuario'].includes(campo))) falhar(400, 'Campo de acesso não permitido.')
    return db.transaction(async transaction => {
        const admins = await Usuario.findAll({ where: { ativo: true, tipo_usuario: 'ADMIN' }, order: [['codUsuario', 'ASC']], transaction, lock: transaction.LOCK.UPDATE })
        if (!admins.some(u => u.codUsuario === autor.codUsuario)) falhar(403, 'Acesso administrativo encerrado.')
        const usuario = await Usuario.findByPk(codigo, { transaction, lock: transaction.LOCK.UPDATE })
        if (!usuario) falhar(404, 'Usuário não encontrado.')
        if (usuario.codUsuario === autor.codUsuario && (!dados.ativo || dados.tipo_usuario !== 'ADMIN')) falhar(409, 'Você não pode remover seu próprio acesso administrativo.')
        if (usuario.ativo && usuario.tipo_usuario === 'ADMIN' && (!dados.ativo || dados.tipo_usuario !== 'ADMIN') && admins.length <= 1) falhar(409, 'Mantenha pelo menos um administrador ativo.')
        const alterado = usuario.ativo !== dados.ativo || usuario.tipo_usuario !== dados.tipo_usuario
        await usuario.update({ ativo: dados.ativo, tipo_usuario: dados.tipo_usuario }, { transaction })
        if (alterado) await revogarSessoes(codigo, transaction)
        const publico = usuario.toJSON(); delete publico.senha
        return publico
    })
}
module.exports = { alterarAcesso }
