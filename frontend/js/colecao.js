document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  document.getElementById('colecaoSair').onclick = () => Auth.logout(); carregarColecao();
});
function erroColecao(err) {
  if (err.status === 401) { Auth.clearSession(); Auth.requireAuth(); return; }
  const el = document.getElementById('colecaoMessage'); el.hidden = false; el.textContent = err.message;
}
async function acaoColecao(fn) { try { await fn(); carregarColecao(); } catch (err) { erroColecao(err); } }
async function carregarColecao() {
  try {
    const [favoritos, alertas, avisos, rotacao] = await Promise.all(['/favoritos', '/alertas', '/notificacoes', '/rotacao'].map(rota => Api.get('/comunidade' + rota)));
    const fav = document.getElementById('colecaoFavoritos'); fav.replaceChildren();
    if (!favoritos.favoritos.length) fav.appendChild(Loja.el('p', 'loja-subtitle', 'Salve modelos do catálogo para encontrá-los aqui.'));
    favoritos.favoritos.forEach(f => {
      const card = Loja.card(f.produto); const remover = Loja.el('button', 'btn btn-ghost btn-sm', 'Remover favorito'); remover.onclick = () => acaoColecao(() => Api.delete(`/comunidade/favoritos/${f.idProduto}`));
      const label = Loja.el('label', 'form-label mt-md', 'Adicionar à rotação'); const select = Loja.el('select', 'form-control'); select.setAttribute('aria-label', `Uso de ${f.produto.nome}`);
      for (const [value, nome] of [['DIARIO', 'Dia a dia'], ['VELOCIDADE', 'Velocidade'], ['PROVA', 'Provas']]) { const opt = Loja.el('option', '', nome); opt.value = value; select.appendChild(opt); }
      const adicionar = Loja.el('button', 'btn btn-outline btn-sm mt-md', 'Organizar par'); adicionar.onclick = () => acaoColecao(() => Api.put(`/comunidade/rotacao/${f.idProduto}`, { uso: select.value })); card.append(remover, label, select, adicionar); fav.appendChild(card);
    });
    const watch = document.getElementById('colecaoAlertas'); watch.replaceChildren();
    if (!alertas.alertas.length) watch.appendChild(Loja.el('p', 'loja-subtitle', 'Nenhum aviso ativo. Escolha uma opção esgotada na página do produto para acompanhar a reposição.'));
    alertas.alertas.forEach(a => { const card = Loja.el('div', 'loja-panel'); const v = a.variante; card.appendChild(Loja.el('p', '', `${v.produto.nome} · ${v.tamanho} · ${v.cor}`)); const btn = Loja.el('button', 'btn btn-outline btn-sm mt-md', 'Parar de acompanhar'); btn.onclick = () => acaoColecao(() => Api.delete(`/comunidade/alertas/${a.idVariante}`)); card.appendChild(btn); watch.appendChild(card); });
    const notifications = document.getElementById('colecaoNotificacoes'); notifications.replaceChildren();
    if (!avisos.notificacoes.length) notifications.appendChild(Loja.el('p', 'loja-subtitle', 'As novidades dos seus pedidos e reposições aparecerão aqui.'));
    avisos.notificacoes.forEach(n => { const card = Loja.el('article', `loja-panel loja-notification${n.lida ? ' lida' : ''}`); card.append(Loja.el('h3', '', n.titulo), Loja.el('p', 'loja-subtitle', n.mensagem));
      if (n.idProduto) { const link = Loja.el('a', 'btn btn-outline btn-sm mt-md', 'Ver produto'); link.href = `produto.html?id=${n.idProduto}`; card.appendChild(link); }
      if (!n.lida) { const btn = Loja.el('button', 'btn btn-ghost btn-sm mt-md', 'Marcar como lida'); btn.onclick = () => acaoColecao(() => Api.patch(`/comunidade/notificacoes/${n.codNotificacao}`, {})); card.appendChild(btn); }
      notifications.appendChild(card);
    });
    const pares = document.getElementById('colecaoRotacao'); pares.replaceChildren();
    if (!rotacao.rotacao.length) pares.appendChild(Loja.el('p', 'loja-subtitle', 'Use seus favoritos para organizar pares por finalidade.'));
    const nomes = { DIARIO: 'Dia a dia', VELOCIDADE: 'Velocidade', PROVA: 'Provas' };
    rotacao.rotacao.forEach(r => { const card = Loja.card(r.produto); const btn = Loja.el('button', 'btn btn-ghost btn-sm mt-md', 'Remover da rotação'); btn.onclick = () => acaoColecao(() => Api.delete(`/comunidade/rotacao/${r.idProduto}`)); card.append(Loja.el('p', '', nomes[r.uso]), btn); pares.appendChild(card); });
  } catch (err) { erroColecao(err); }
}
