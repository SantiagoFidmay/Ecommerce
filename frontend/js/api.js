/**
 * api.js — Abstração de chamadas para a API backend
 */

const API_BASE = 'http://localhost:3001/api';

const Api = {
  /**
   * Faz uma requisição para a API
   */
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('sk_token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw { status: res.status, message: data.erro || data.error || 'Erro na requisição' };
      }

      return data;
    } catch (err) {
      if (err.status) throw err;
      throw { status: 0, message: 'Sem conexão com o servidor. Verifique se o backend está rodando.' };
    }
  },

  get: (ep) => Api.request(ep),
  post: (ep, body) => Api.request(ep, { method: 'POST', body: JSON.stringify(body) }),
  put: (ep, body) => Api.request(ep, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (ep, body) => Api.request(ep, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (ep) => Api.request(ep, { method: 'DELETE' }),

  // Endpoints específicos
  login: (email, senha) => Api.post('/login', { email, senha }),
  cadastrar: (dados) => Api.post('/usuarios', dados),
  getProdutos: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return Api.get(`/produtos${qs ? '?' + qs : ''}`);
  },
  getProduto: (id) => Api.get(`/produtos/${id}`),
  getCategorias: () => Api.get('/categorias'),
  buscarProdutos: (params) => Api.get(`/produtos/buscar?${new URLSearchParams(params)}`),
  criarPedido: (dados) => Api.post('/pedidos', dados),
  resumirPedido: (itens) => Api.post('/pedidos/resumo', { itens }),
  getMeusPedidos: () => Api.get('/pedidos/meus-pedidos'),
  getPedido: (id) => Api.get(`/pedidos/${id}`),
  getPerfil: () => Api.get('/usuarios/perfil'),
  atualizarPerfil: (id, dados) => Api.put(`/usuarios/${id}`, dados),
  atualizarPerfilParcial: (id, dados) => Api.patch(`/usuarios/${id}`, dados),
  getRelatorioVendas: () => Api.get('/relatorios/vendas'),
  getRelatorioFaturamento: () => Api.get('/relatorios/faturamento'),
  getRelatorioEstoque: () => Api.get('/relatorios/estoque'),
  getDashboard: () => Api.get('/relatorios/dashboard'),
  // Estoque (admin)
  getEstoque: () => Api.get('/estoque'),
  getEstoqueCriticos: () => Api.get('/estoque/criticos'),
  atualizarEstoque: (id, dados) => Api.put(`/estoque/${id}`, dados),
  movimentarEstoque: (id, dados) => Api.patch(`/estoque/${id}/movimentar`, dados),
  // Produtos admin
  criarProduto: (dados) => Api.post('/produtos', dados),
  atualizarProduto: (id, dados) => Api.put(`/produtos/${id}`, dados),
  deletarProduto: (id) => Api.delete(`/produtos/${id}`),
  // Categorias admin
  criarCategoria: (dados) => Api.post('/categorias', dados),
  atualizarCategoria: (id, dados) => Api.put(`/categorias/${id}`, dados),
  // Pedidos admin
  listarPedidos: () => Api.get('/pedidos'),
  atualizarStatusPedido: (id, status) => Api.patch(`/pedidos/${id}/status`, { status }),
  // Entregas admin
  atualizarStatusEntrega: (id, dados) => Api.patch(`/entregas/${id}/status`, dados)
};

window.Api = Api;
