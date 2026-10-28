const Loja = {
  el(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto != null) el.textContent = texto;
    return el;
  },
  moeda: valor => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  imagem(src) {
    if (!src) return Auth.url('assets/images/placeholder.svg');
    if (/^(?:\.\.\/)*imagens\//.test(src)) return new URL(src.replace(/^(?:\.\.\/)*imagens\//, '../imagens/'), Auth.url()).href;
    try { const url = new URL(src, window.location.href); return ['http:', 'https:'].includes(url.protocol) ? url.href : Auth.url('assets/images/placeholder.svg'); }
    catch { return Auth.url('assets/images/placeholder.svg'); }
  },
  compararIds() {
    try { const lista = JSON.parse(localStorage.getItem('sk_compare') || '[]'); return Array.isArray(lista) ? lista.filter(id => Number.isSafeInteger(id) && id > 0).slice(0, 3) : []; }
    catch { return []; }
  },
  comparar(id) {
    const ids = this.compararIds();
    if (!ids.includes(id)) {
      if (ids.length >= 3) { showToast('Compare até três modelos por vez.', 'warning'); return; }
      ids.push(id);
      localStorage.setItem('sk_compare', JSON.stringify(ids));
    }
    window.location.href = Auth.url('pages/comparar.html');
  },
  async favorito(id) {
    if (!Auth.requireAuth()) return;
    try { await Api.put(`/comunidade/favoritos/${id}`, {}); showToast('Salvo na sua coleção!', 'success'); }
    catch (err) { showToast(err.message, 'error'); }
  },
  card(produto) {
    const card = this.el('article', 'loja-card');
    const link = this.el('a');
    link.href = Auth.url(`pages/produto.html?id=${produto.codProduto}`);
    const img = this.el('img');
    img.src = this.imagem(produto.imagem_url); img.alt = produto.nome; img.loading = 'lazy';
    img.onerror = () => { img.onerror = null; img.src = Auth.url('assets/images/placeholder.svg'); };
    link.append(img, this.el('span', 'conta-muted', produto.marca), this.el('h3', '', produto.nome), this.el('strong', '', this.moeda(produto.preco_promocional ?? produto.preco)));
    const acoes = this.el('div', 'loja-actions');
    const comparar = this.el('button', 'btn btn-outline btn-sm', 'Comparar'); comparar.onclick = () => this.comparar(produto.codProduto);
    const favorito = this.el('button', 'btn btn-ghost btn-sm', 'Salvar'); favorito.onclick = () => this.favorito(produto.codProduto);
    acoes.append(comparar, favorito); card.append(link, acoes); return card;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const menu = document.getElementById('navMenu');
  if (menu) for (const [pagina, titulo] of [['quiz', 'Descubra'], ['marcas', 'Marcas']]) {
    if (menu.querySelector(`[data-loja="${pagina}"]`)) continue;
    const link = Loja.el('a', 'navbar-link', titulo); link.href = Auth.url(`pages/${pagina}.html`); link.dataset.loja = pagina; menu.appendChild(link);
  }
  const sidebar = document.querySelector('.conta-sidebar');
  if (sidebar && !sidebar.querySelector('[data-colecao]')) {
    const link = Loja.el('a', '', 'Minha coleção'); link.href = Auth.url('pages/colecao.html'); link.dataset.colecao = 'true';
    if (window.location.pathname.endsWith('/colecao.html')) link.setAttribute('aria-current', 'page');
    sidebar.insertBefore(link, sidebar.querySelector('button'));
  }
});
