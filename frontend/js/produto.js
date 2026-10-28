let produtoAtual = null;
let varianteAtual = null;
let corAtual = null;

document.addEventListener('DOMContentLoaded', () => carregarProduto(new URLSearchParams(location.search).get('id')));

async function carregarProduto(id) {
  if (!/^[1-9]\d*$/.test(id || '')) { location.href = 'catalogo.html'; return; }
  try {
    const p = await Api.getProduto(id);
    produtoAtual = { ...p, id: p.codProduto, estoque: p.estoqueProduto, categoria: p.categoriaProduto };
    renderizarProduto(produtoAtual);
    carregarAvaliacoes(p.codProduto);
  } catch (err) {
    const area = document.querySelector('.pdp-container');
    const erro = Loja.el('div', 'loja-panel');
    erro.append(Loja.el('h1', '', err.status === 404 ? 'Produto não encontrado' : 'Não foi possível carregar este produto'), Loja.el('p', 'loja-subtitle', err.message));
    const link = Loja.el('a', 'btn btn-primary', 'Voltar ao catálogo'); link.href = 'catalogo.html'; erro.appendChild(link);
    area.replaceChildren(erro);
  }
}

function renderizarProduto(p) {
  document.title = `${p.nome} | Sport Kicks`;
  document.getElementById('breadcrumbProduto').textContent = p.nome;
  document.getElementById('pdpTitle').textContent = p.nome;
  document.getElementById('pdpBrand').textContent = p.marca || '';
  const preco = Number(p.preco), final = Number(p.preco_promocional ?? p.preco);
  const promo = final < preco;
  document.getElementById('pdpOldPrice').style.display = promo ? 'block' : 'none';
  document.getElementById('pdpOldPrice').textContent = Loja.moeda(preco);
  document.getElementById('pdpBadge').style.display = promo ? 'block' : 'none';
  document.getElementById('pdpPrice').textContent = Loja.moeda(final);
  document.getElementById('pdpInstallment').textContent = Loja.moeda(final / 10);
  document.getElementById('pdpRating').textContent = p.avaliacoes?.total ? `${Number(p.avaliacoes.media).toFixed(1)} / 5 · ${p.avaliacoes.total} avaliação(ões) verificada(s)` : 'Este modelo ainda não tem avaliações de clientes.';
  const imagens = (p.midias || []).filter(m => m.tipo === 'IMAGEM').sort((a,b) => a.ordem - b.ordem);
  if (!imagens.length) imagens.push({ url: p.imagem_url, titulo: p.nome });
  const main = document.getElementById('mainImage');
  main.src = Loja.imagem(imagens[0].url); main.alt = p.nome;
  main.onerror = () => { main.onerror = null; main.src = Auth.url('assets/images/placeholder.svg'); };
  const thumbs = document.getElementById('thumbnailsContainer'); thumbs.replaceChildren();
  imagens.forEach((midia, i) => {
    const btn = Loja.el('button', `thumbnail${i === 0 ? ' active' : ''}`); btn.type = 'button'; btn.setAttribute('aria-label', `Ver foto ${i + 1} de ${p.nome}`);
    const img = Loja.el('img'); img.src = Loja.imagem(midia.url); img.alt = midia.titulo || p.nome; img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'contain';
    btn.appendChild(img);
    btn.onclick = () => { main.src = Loja.imagem(midia.url); thumbs.querySelectorAll('button').forEach(b => b.classList.remove('active')); btn.classList.add('active'); };
    thumbs.appendChild(btn);
  });
  const variantes = p.variantes || [];
  const primeira = variantes.find(v => v.quantidade > 0) || variantes[0];
  corAtual = primeira?.cor || null;
  varianteAtual = primeira || null;
  renderizarOpcoes();
  document.getElementById('pdpCompare').onclick = () => Loja.comparar(p.codProduto);
  document.getElementById('pdpFavorite').onclick = () => Loja.favorito(p.codProduto);
  document.getElementById('pdpDescription').textContent = p.descricao || 'Confira as fotos, as opções disponíveis e o review deste modelo.';
  const ficha = p.fichaTecnica?.dados || {};
  const campos = [['Peso', ficha.peso_g != null ? `${ficha.peso_g} g` : null], ['Drop', ficha.drop_mm != null ? `${ficha.drop_mm} mm` : null], ['Placa', ficha.placa == null ? null : ficha.placa ? 'Sim' : 'Não'], ['Amortecimento', ficha.amortecimento], ['Superfície', ficha.superficie], ['Finalidades', ficha.finalidades?.join(', ')]];
  const dl = document.getElementById('pdpFicha'); dl.replaceChildren();
  campos.forEach(([nome, valor]) => dl.append(Loja.el('dt', '', nome), Loja.el('dd', '', valor || 'Não informado')));
  const fonte = document.getElementById('pdpFonte'); fonte.hidden = !ficha.fonte; if (ficha.fonte) fonte.href = ficha.fonte;
  renderizarReview(p);
  const historico = document.getElementById('pdpHistory'); historico.replaceChildren();
  if (!p.historicoPrecos?.length) historico.appendChild(Loja.el('p', 'loja-subtitle', 'O acompanhamento deste modelo ainda não começou.'));
  else {
    const table = Loja.el('table', 'loja-history'); const head = Loja.el('thead'), row = Loja.el('tr'); row.append(Loja.el('th', '', 'Data'), Loja.el('th', '', 'Preço')); head.appendChild(row); table.appendChild(head);
    const body = Loja.el('tbody'); p.historicoPrecos.forEach(h => { const linha = Loja.el('tr'); linha.append(Loja.el('td', '', new Date(h.criado_em).toLocaleDateString('pt-BR')), Loja.el('td', '', Loja.moeda(h.preco))); body.appendChild(linha); }); table.appendChild(body); historico.appendChild(table);
  }
}

function renderizarOpcoes() {
  const p = produtoAtual;
  const cores = document.getElementById('pdpColors'); cores.replaceChildren();
  const tamanhos = document.getElementById('pdpSizes'); tamanhos.replaceChildren();
  for (const cor of [...new Set((p.variantes || []).map(v => v.cor))]) {
    const btn = Loja.el('button', `btn btn-sm ${cor === corAtual ? 'btn-primary' : 'btn-outline'}`, cor);
    btn.type = 'button'; btn.setAttribute('aria-pressed', String(cor === corAtual));
    btn.onclick = () => { corAtual = cor; varianteAtual = p.variantes.find(v => v.cor === cor && v.quantidade > 0) || p.variantes.find(v => v.cor === cor); renderizarOpcoes(); };
    cores.appendChild(btn);
  }
  for (const v of (p.variantes || []).filter(v => v.cor === corAtual)) {
    const btn = Loja.el('button', `size-btn${v.codVariante === varianteAtual?.codVariante ? ' active' : ''}`, v.tamanho);
    btn.type = 'button'; btn.title = v.quantidade > 0 ? `${v.quantidade} disponível(is)` : 'Sem estoque · ative um aviso';
    btn.setAttribute('aria-pressed', String(v.codVariante === varianteAtual?.codVariante)); btn.onclick = () => { varianteAtual = v; renderizarOpcoes(); };
    tamanhos.appendChild(btn);
  }
  const comprar = document.getElementById('btnAddToCart');
  const disponivel = varianteAtual ? varianteAtual.quantidade : 0;
  comprar.disabled = disponivel < 1; comprar.textContent = disponivel > 0 ? 'Adicionar ao carrinho' : 'Indisponível nesta opção';
  comprar.onclick = () => Carrinho.adicionar({ ...p, estoque: { quantidade: disponivel } }, 1, varianteAtual.tamanho, varianteAtual.cor, varianteAtual.codVariante);
  document.getElementById('pdpAvailability').textContent = varianteAtual ? `${varianteAtual.tamanho} · ${varianteAtual.cor} · ${disponivel > 0 ? 'Disponível' : 'Aguardando reposição'}` : 'Nenhuma opção disponível no momento.';
  const avisar = document.getElementById('pdpNotify'); avisar.hidden = !varianteAtual || disponivel > 0;
  avisar.onclick = async () => {
    if (!Auth.requireAuth()) return;
    try { await Api.put(`/comunidade/alertas/${varianteAtual.codVariante}`, {}); showToast('Aviso ativado! A reposição aparecerá na sua coleção.', 'success'); }
    catch (err) { showToast(err.message, 'error'); }
  };
}

function renderizarReview(p) {
  const review = (p.midias || []).find(m => m.tipo === 'REVIEW');
  const area = document.getElementById('pdpReview'); area.hidden = !review;
  const player = document.getElementById('pdpReviewPlayer'); player.replaceChildren();
  if (!review) return;
  let codigo; try { const url = new URL(review.url); codigo = url.searchParams.get('v') || url.pathname.split('/').at(-1); } catch { return; }
  if (!/^[\w-]{11}$/.test(codigo)) return;
  document.getElementById('pdpReviewSubtitle').textContent = review.credito || `Review independente de ${p.nome}.`;
  const iframe = Loja.el('iframe'); iframe.src = `https://www.youtube-nocookie.com/embed/${codigo}`; iframe.title = review.titulo || `Review de ${p.nome}`; iframe.loading = 'lazy'; iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share'; iframe.referrerPolicy = 'strict-origin-when-cross-origin'; iframe.allowFullscreen = true; player.appendChild(iframe);
  document.getElementById('pdpReviewLink').href = `https://www.youtube.com/watch?v=${codigo}`;
}

async function carregarAvaliacoes(id) {
  const area = document.getElementById('pdpReviews');
  try {
    const res = await Api.get(`/comunidade/produtos/${id}/avaliacoes`); area.replaceChildren();
    if (!res.avaliacoes.length) area.appendChild(Loja.el('p', 'loja-subtitle', 'Seja a primeira pessoa a avaliar este modelo após receber sua compra.'));
    res.avaliacoes.forEach(a => { const card = Loja.el('article', 'loja-review'); card.append(Loja.el('strong', '', `${a.autor} · ${a.nota}/5 · Compra verificada`), Loja.el('p', '', a.comentario), Loja.el('p', 'loja-subtitle', `Ajuste: ${a.ajuste.toLowerCase()}`)); area.appendChild(card); });
  } catch { area.textContent = 'Não foi possível carregar as avaliações agora.'; }
}
