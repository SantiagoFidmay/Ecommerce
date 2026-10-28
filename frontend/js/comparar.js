document.addEventListener('DOMContentLoaded', async () => {
  const select = document.getElementById('compararProduto');
  document.getElementById('compararForm').onsubmit = event => {
    event.preventDefault(); const id = Number(select.value); const ids = Loja.compararIds();
    if (ids.includes(id)) return;
    if (ids.length >= 3) { mensagemComparar('Remova um modelo para adicionar outro. O limite é três.'); return; }
    ids.push(id); localStorage.setItem('sk_compare', JSON.stringify(ids)); renderizarComparador();
  };
  try {
    const res = await Api.getProdutos({ limite: 100, ordem: 'nome' }); select.replaceChildren(Loja.el('option', '', 'Selecione um modelo')); select.firstChild.value = '';
    res.produtos.forEach(p => { const opt = Loja.el('option', '', p.nome); opt.value = p.codProduto; select.appendChild(opt); });
    renderizarComparador();
  } catch (err) { mensagemComparar(err.message); }
});
function mensagemComparar(texto) { const msg = document.getElementById('compararMessage'); msg.hidden = !texto; msg.textContent = texto; }
async function renderizarComparador() {
  const area = document.getElementById('compararTabela'); area.replaceChildren();
  const ids = Loja.compararIds();
  if (!ids.length) { mensagemComparar('Adicione até três modelos para começar.'); return; }
  mensagemComparar('Carregando comparação…');
  const resultados = await Promise.allSettled(ids.map(id => Api.getProduto(id)));
  const produtos = resultados.filter(r => r.status === 'fulfilled').map(r => r.value);
  mensagemComparar(resultados.some(r => r.status === 'rejected') ? 'Algum modelo está indisponível. Remova-o da seleção ou tente novamente.' : '');
  const acoes = Loja.el('div', 'loja-actions loja-section'); ids.forEach(id => { const btn = Loja.el('button', 'btn btn-ghost btn-sm', `Remover ${produtos.find(p => p.codProduto === id)?.nome || 'modelo indisponível'}`); btn.onclick = () => { localStorage.setItem('sk_compare', JSON.stringify(ids.filter(v => v !== id))); renderizarComparador(); }; acoes.appendChild(btn); });
  area.appendChild(acoes);
  if (!produtos.length) return;
  const wrap = Loja.el('div', 'loja-table-wrap'); const tabela = Loja.el('table', 'loja-table'); tabela.appendChild(Loja.el('caption', '', 'Comparação dos modelos selecionados'));
  const head = Loja.el('thead'), tr = Loja.el('tr'); tr.appendChild(Loja.el('th', '', 'Característica'));
  produtos.forEach(p => { const th = Loja.el('th'); th.scope = 'col'; const img = Loja.el('img', 'loja-compare-image'); img.src = Loja.imagem(p.imagem_url); img.alt = p.nome; const link = Loja.el('a', '', p.nome); link.href = `produto.html?id=${p.codProduto}`; th.append(img, link); tr.appendChild(th); }); head.appendChild(tr); tabela.appendChild(head);
  const body = Loja.el('tbody');
  const linhas = [
    ['Marca', p => p.marca], ['Preço atual', p => Loja.moeda(p.preco_promocional ?? p.preco)], ['Categoria', p => p.categoriaProduto?.nome],
    ['Disponibilidade', p => p.estoqueProduto?.quantidade > 0 ? 'Disponível' : 'Aguardando reposição'],
    ['Tamanhos com estoque', p => [...new Set((p.variantes || []).filter(v => v.quantidade > 0).map(v => v.tamanho))].join(', ') || 'Nenhum'],
    ['Peso', p => p.fichaTecnica?.dados?.peso_g != null ? `${p.fichaTecnica.dados.peso_g} g` : null], ['Drop', p => p.fichaTecnica?.dados?.drop_mm != null ? `${p.fichaTecnica.dados.drop_mm} mm` : null],
    ['Placa', p => p.fichaTecnica?.dados?.placa == null ? null : p.fichaTecnica.dados.placa ? 'Sim' : 'Não'],
    ['Amortecimento', p => p.fichaTecnica?.dados?.amortecimento], ['Finalidades', p => p.fichaTecnica?.dados?.finalidades?.join(', ')],
    ['Avaliações', p => p.avaliacoes?.total ? `${Number(p.avaliacoes.media).toFixed(1)}/5 · ${p.avaliacoes.total} avaliações` : 'Ainda sem avaliações']
  ];
  linhas.forEach(([titulo, obter]) => { const linha = Loja.el('tr'); const th = Loja.el('th', '', titulo); th.scope = 'row'; linha.appendChild(th); produtos.forEach(p => linha.appendChild(Loja.el('td', '', obter(p) || 'Não informado'))); body.appendChild(linha); });
  tabela.appendChild(body); wrap.appendChild(tabela); area.appendChild(wrap);
}
