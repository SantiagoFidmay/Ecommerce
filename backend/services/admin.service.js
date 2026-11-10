const { Usuario } = require('../models/rel')

function eAdminPrincipal(email) {
    const principal = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    return Boolean(principal && typeof email === 'string' && email.trim().toLowerCase() === principal)
}

async function garantirAdminPrincipal() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    if (!email) return
    await Usuario.update({ tipo_usuario: 'ADMIN' }, { where: { email, tipo_usuario: 'CLIENTE' } })
}

module.exports = { eAdminPrincipal, garantirAdminPrincipal }
