const Conta = {
  moeda: valor => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  estados: {
    PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado', EM_SEPARACAO: 'Em separação', ENVIADO: 'Enviado',
    ENTREGUE: 'Entregue', CANCELADO: 'Cancelado', EM_TRANSITO: 'Em trânsito', SAIU_PARA_ENTREGA: 'Saiu para entrega',
    TENTATIVA_FALHA: 'Tentativa de entrega sem sucesso', DEVOLVIDO: 'Devolvido'
  },

  iniciar() {
    if (!Auth.requireAuth()) return false;
    document.getElementById('sairConta').onclick = () => Auth.logout();
    return true;
  },

  elemento(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto != null) el.textContent = texto;
    return el;
  },

  data(valor, incluirHora = true) {
    if (!valor) return 'Não informada';
    const data = new Date(/^\d{4}-\d{2}-\d{2}$/.test(valor) ? `${valor}T12:00:00` : valor);
    if (Number.isNaN(data.getTime())) return 'Não informada';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', ...(incluirHora ? { timeStyle: 'short' } : {}), timeZone: 'America/Sao_Paulo' }).format(data);
  },

  badge(status) {
    const cor = status === 'ENTREGUE' ? 'success' : ['CANCELADO', 'DEVOLVIDO', 'TENTATIVA_FALHA'].includes(status) ? 'warning' : 'info';
    return this.elemento('span', `conta-status conta-status-${cor}`, this.estados[status] || 'Status não informado');
  },

  mensagem(id, texto, tipo = 'info') {
    const el = document.getElementById(id);
    el.textContent = texto;
    el.className = `conta-message conta-message-${tipo}`;
    el.hidden = !texto;
  },

  erro(err, id) {
    if (err.status === 401) {
      Auth.clearSession();
      Auth.requireAuth();
      return;
    }
    this.mensagem(id, err.message || 'Não foi possível carregar os dados. Tente novamente.', 'error');
  },

  imagem(produto) {
    const img = this.elemento('img', 'conta-product-image');
    img.alt = produto.nome || 'Produto';
    img.loading = 'lazy';
    const fallback = Auth.url('assets/images/placeholder.svg');
    try {
      const url = new URL(produto.imagem_url || fallback, window.location.href);
      img.src = ['http:', 'https:'].includes(url.protocol) ? url.href : fallback;
    } catch { img.src = fallback; }
    img.onerror = () => { img.onerror = null; img.src = fallback; };
    return img;
  }
};
