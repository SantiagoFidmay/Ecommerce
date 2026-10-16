/**
 * catalogo.js — Lógica do catálogo de produtos
 */

let produtosCache = [];
let paginaAtual = 1;
const porPagina = 12;
let filtrosAtuais = {};
let ultimaRequisicao = 0;

document.addEventListener('DOMContentLoaded', async () => {
  await carregarCategorias();
  verificarQueryParams();
  await filtrar();
});

async function carregarCategorias() {
  const select = document.getElementById('selectCategoria');
  if (!select) return;
  try {
    const res = await Api.getCategorias();
    (res.categorias || []).forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.codCategoria;
      opt.textContent = `${cat.icone || ''} ${cat.nome}`;
      select.appendChild(opt);
    });
  } catch { /* ignora */ }
}

function verificarQueryParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('categoria')) {
    const sel = document.getElementById('selectCategoria');
    if (sel) sel.value = params.get('categoria');
  }
  if (params.get('destaque') === 'true') {
    filtrosAtuais.destaque = 'true';
  }
}

async function carregarProdutos(params = filtrosAtuais) {
  const requisicao = ++ultimaRequisicao;
  const grid = document.getElementById('produtosGrid');
  const countEl = document.getElementById('catalogCount');
  const emptyEl = document.getElementById('catalogEmpty');
  if (!grid) return;
  emptyEl?.classList.add('hidden');
  renderizarPaginacao(0);

  // Skeleton
  grid.innerHTML = Array(6).fill('').map(() => `
    <div style="
      background:linear-gradient(90deg,var(--bg-card) 25%,var(--bg-card-hover) 50%,var(--bg-card) 75%);
      background-size:200% 100%;animation:shimmer 1.5s infinite;
      border-radius:var(--radius-xl);height:380px;
    "></div>
  `).join('');

  try {
    const res = await Api.getProdutos({
      ...params,
      pagina: paginaAtual,
      limite: porPagina
    });
    if (requisicao !== ultimaRequisicao) return;
    produtosCache = res.produtos || [];
    const total = res.total || 0;

    if (countEl) countEl.textContent = `${total} produto${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`;

    if (produtosCache.length === 0) {
      grid.innerHTML = '';
      emptyEl?.classList.remove('hidden');
      renderizarPaginacao(0);
      return;
    }

    emptyEl?.classList.add('hidden');
    renderizarGrid(produtosCache);
    renderizarPaginacao(total);
  } catch (err) {
    if (requisicao !== ultimaRequisicao) return;
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-secondary)">
      <p style="font-size:2rem;margin-bottom:1rem">⚠️</p>
      <p>Não foi possível conectar ao servidor.</p>
      <p style="font-size:0.8rem;margin-top:0.5rem;color:var(--text-muted)">${err.message || 'Verifique se o backend está rodando na porta 3001'}</p>
    </div>`;
    if (countEl) countEl.textContent = 'Erro ao carregar produtos';
  }
}

function getImagemCatalogo(p) {
  if (p.imagem_url) {
    return p.imagem_url.replace(/^(?:\.\.\/)*imagens\//, '../../imagens/');
  }
  const nomeLower = (p.nome || '').toLowerCase();
  if (nomeLower.includes('boston')) return '../../imagens/boston13-1.webp';
  if (nomeLower.includes('adios')) return '../../imagens/adiospro1.avif';
  if (nomeLower.includes('hyperboost')) return '../../imagens/hyperboostEdge1.avif';
  if (nomeLower.includes('evo')) return '../../imagens/evosl1.avif';
  return p.imagem_url || '../assets/images/placeholder.svg';
}

function renderizarGrid(produtos) {
  const grid = document.getElementById('produtosGrid');
  grid.innerHTML = produtos.map(p => {
    p = { ...p, id: p.codProduto, estoque: p.estoqueProduto, categoria: p.categoriaProduto };
    const semEstoque = p.estoque && p.estoque.quantidade === 0;
    const temPromo = p.preco_promocional && parseFloat(p.preco_promocional) < parseFloat(p.preco);
    const imgSrc = getImagemCatalogo(p);
    return `
      <div class="produto-card" id="prod-${p.id}" onclick="abrirDetalhe(${p.id})">
        <div class="produto-card-img">
          ${temPromo ? '<span class="produto-card-badge">Promoção</span>' : ''}
          <img src="${imgSrc}" alt="${p.nome}" loading="lazy" onerror="this.onerror=null;this.src='../assets/images/placeholder.svg'">
          ${semEstoque ? '<div class="produto-card-estoque-zero"><span>Esgotado</span></div>' : ''}
        </div>
        <div class="produto-card-body">
          <div class="produto-card-marca">${p.marca || ''}</div>
          <h3 class="produto-card-nome"><a href="produto.html?id=${p.id}">${p.nome}</a></h3>
          <div class="produto-card-categoria">${p.categoria?.icone || ''} ${p.categoria?.nome || ''}</div>
          <div class="produto-card-footer">
            <div class="produto-card-preco">
              ${temPromo ? `<span class="produto-card-preco-old">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</span>` : ''}
              <span class="produto-card-preco-current${temPromo ? ' em-promo' : ''}">
                R$ ${parseFloat(p.preco_promocional || p.preco).toFixed(2).replace('.', ',')}
              </span>
              <span class="produto-card-parcelas">10x de R$ ${(parseFloat(p.preco_promocional || p.preco) / 10).toFixed(2).replace('.', ',')}</span>
            </div>
            <button class="btn-cart" title="Adicionar ao carrinho"
              onclick="event.stopPropagation(); addCart(${p.id})"
              ${semEstoque ? 'disabled' : ''}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderizarPaginacao(total) {
  const paginacao = document.getElementById('pagination');
  if (!paginacao) return;
  const totalPaginas = Math.ceil(total / porPagina);
  if (totalPaginas <= 1) { paginacao.innerHTML = ''; return; }

  paginacao.innerHTML = Array.from({ length: totalPaginas }, (_, i) => `
    <button class="page-btn${paginaAtual === i + 1 ? ' active' : ''}"
      ${paginaAtual === i + 1 ? 'aria-current="page"' : ''} aria-label="Página ${i + 1}" onclick="mudarPagina(${i + 1})">${i + 1}</button>
  `).join('');
}

function mudarPagina(pagina) {
  paginaAtual = pagina;
  const carregamento = carregarProdutos();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  return carregamento;
}

let debounceTimer = null;
function debounce(fn, delay) {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), delay);
  };
}

function filtrar(extra = {}) {
  const busca = document.getElementById('inputBusca')?.value;
  const categoria_id = document.getElementById('selectCategoria')?.value;
  const precoMax = document.getElementById('rangePreco')?.value;
  const ordem = document.getElementById('selectOrdem')?.value;

  const params = {};
  if (busca) params.busca = busca;
  if (categoria_id) params.categoria_id = categoria_id;
  if (precoMax && Number(precoMax) < Number(document.getElementById('rangePreco').max)) params.preco_max = precoMax;
  if (ordem) params.ordem = ordem;
  Object.assign(params, extra);
  if (filtrosAtuais.destaque && extra.destaque === undefined) params.destaque = filtrosAtuais.destaque;
  filtrosAtuais = params;

  paginaAtual = 1;
  return carregarProdutos();
}

function limparFiltros() {
  ['inputBusca', 'selectCategoria', 'selectOrdem'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'selectOrdem' ? 'recomendados' : '';
  });
  const range = document.getElementById('rangePreco');
  if (range) { range.value = range.max; document.getElementById('precoLabel').textContent = 'Sem limite'; }
  paginaAtual = 1;
  filtrosAtuais = {};
  filtrar();
}

function toggleSidebar() {
  const aberto = document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('btnFiltros')?.setAttribute('aria-expanded', String(Boolean(aberto)));
}

function abrirDetalhe(id) {
  window.location.href = `produto.html?id=${id}`;
}

function addCart(id) {
  const produto = produtosCache.find(p => p.codProduto === id);
  if (produto) Carrinho.adicionar({ ...produto, id: produto.codProduto, estoque: produto.estoqueProduto });
}

window.filtrar = filtrar;
window.limparFiltros = limparFiltros;
window.toggleSidebar = toggleSidebar;
window.mudarPagina = mudarPagina;
window.addCart = addCart;
window.debounce = debounce;
