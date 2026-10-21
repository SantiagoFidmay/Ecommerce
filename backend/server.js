require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const conn = require('./db/conn');

const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const produtosRoutes = require('./routes/produtos.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const estoqueRoutes = require('./routes/estoque.routes');
const pedidosRoutes = require('./routes/pedidos.routes');
const entregasRoutes = require('./routes/entregas.routes');
const relatoriosRoutes = require('./routes/relatorios.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globais
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/entregas', entregasRoutes);
app.use('/api/relatorios', relatoriosRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handler de erros global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    erro: err.message || 'Erro interno do servidor',
    detalhe: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 API disponível em http://localhost:${PORT}/api`);
});
