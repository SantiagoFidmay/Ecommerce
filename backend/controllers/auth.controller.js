const bcrypt   = require('bcryptjs')
const { Usuario } = require('../models/rel')
const { validarCPF } = require('../utils/cpf.util')

const { criarSessao } = require('../services/sessao.service')

// POST /api/login
const login = async (req, res) => {
    try {
        const { email, senha } = req.body || {}
        if (typeof email !== 'string' || typeof senha !== 'string' || email.length > 150 || Buffer.byteLength(senha, 'utf8') > 72) return res.status(400).json({ erro: 'Credenciais inválidas.' })

        if (!email || !senha) {
            return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' })
        }

        const usuario = await Usuario.findOne({ where: { email: email.trim().toLowerCase(), ativo: true } })

        if (!usuario) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' })
        }

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha)
        if (!senhaCorreta) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' })
        }

        const token = await criarSessao(usuario)

        return res.json({
            mensagem: 'Login realizado com sucesso!',
            token,
            usuario: {
                id:   usuario.codUsuario,
                nome: usuario.nome,
                email: usuario.email,
                tipo: usuario.tipo_usuario
            }
        })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao realizar login.', detalhe: err.message })
    }
}

// POST /api/usuarios (cadastro público)
const cadastrar = async (req, res) => {
    try {
        const { nome, email, cpf, senha, telefone, cep, rua, numero, complemento, bairro, cidade, estado } = req.body

        if (typeof nome !== 'string' || !nome.trim() || nome.length > 100 || typeof email !== 'string' || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof cpf !== 'string' || typeof senha !== 'string' || senha.length < 8 || Buffer.byteLength(senha, 'utf8') > 72) {
            return res.status(400).json({ erro: 'Confira nome, e-mail, CPF e senha (mínimo de 8 caracteres).' })
        }

        if (!validarCPF(cpf)) {
            return res.status(400).json({ erro: 'CPF inválido. Verifique os dígitos informados.' })
        }

        try { require('../services/checkout.service').validarEndereco({ cep, rua, numero, complemento, bairro, cidade, estado }) }
        catch (erro) { return res.status(400).json({ erro: erro.message }) }
        const emailExiste = await Usuario.findOne({ where: { email: email.trim().toLowerCase() } })
        if (emailExiste) {
            return res.status(409).json({ erro: 'E-mail já cadastrado.' })
        }

        const cpfLimpo = cpf.replace(/\D/g, '')
        const cpfExiste = await Usuario.findOne({ where: { cpf: cpfLimpo } })
        if (cpfExiste) {
            return res.status(409).json({ erro: 'CPF já cadastrado.' })
        }

        // Hash da senha (bcrypt no controller, não no model)
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
        const senhaHash  = await bcrypt.hash(senha, saltRounds)

        const usuario = await Usuario.create({
            nome: nome.trim(),
            email: email.trim().toLowerCase(),
            cpf: cpfLimpo,
            senha: senhaHash,
            telefone,
            cep,
            rua,
            numero,
            complemento,
            bairro,
            cidade,
            estado
        })

        const token = await criarSessao(usuario)

        return res.status(201).json({
            mensagem: 'Cadastro realizado com sucesso!',
            token,
            usuario: {
                id:   usuario.codUsuario,
                nome: usuario.nome,
                email: usuario.email,
                tipo: usuario.tipo_usuario
            }
        })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao cadastrar usuário.', detalhe: err.message })
    }
}

module.exports = { login, cadastrar }
