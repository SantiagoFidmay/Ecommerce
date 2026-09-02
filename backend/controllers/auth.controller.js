const jwt      = require('jsonwebtoken')
const bcrypt   = require('bcryptjs')
const { Usuario } = require('../models/rel')
const { validarCPF } = require('../utils/cpf.util')

// Gera um JWT para o usuário
const gerarToken = (usuario) => {
    return jwt.sign(
        {
            id:   usuario.codUsuario,
            email: usuario.email,
            tipo: usuario.tipo_usuario
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )
}

// POST /api/login
const login = async (req, res) => {
    try {
        const { email, senha } = req.body

        if (!email || !senha) {
            return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' })
        }

        const usuario = await Usuario.findOne({ where: { email, ativo: true } })

        if (!usuario) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' })
        }

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha)
        if (!senhaCorreta) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' })
        }

        const token = gerarToken(usuario)

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

        if (!nome || !email || !cpf || !senha) {
            return res.status(400).json({ erro: 'Nome, e-mail, CPF e senha são obrigatórios.' })
        }

        if (!validarCPF(cpf)) {
            return res.status(400).json({ erro: 'CPF inválido. Verifique os dígitos informados.' })
        }

        const emailExiste = await Usuario.findOne({ where: { email } })
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
            nome,
            email,
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

        const token = gerarToken(usuario)

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
