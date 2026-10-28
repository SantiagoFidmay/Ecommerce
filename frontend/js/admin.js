let adminProdutos = [], adminCategorias = [], adminMarcas = [], graficosAdmin = [], dadosRelatorio = [];
const valorAdmin = id => document.getElementById(id).value.trim();
function mensagemAdmin(texto, erro = false) {
  const el = document.getElementById('adminMessage'); el.hidden = !texto; el.textContent = texto;
  el.className = `conta-message conta-message-${erro ? 'error' : 'success'}`;
}
async function executarAdmin(fn, btn) {
  if (btn) btn.disabled = true;
  try { await fn(); mensagemAdmin('Operação concluída.'); }
  catch (err) {
    if (err.status === 401) { Auth.clearSession(); Auth.requireAuth(); }
    mensagemAdmin(err.message || 'Não foi possível concluir a operação.', true);
  } finally { if (btn) btn.disabled = false; }
}
function tabelaAdmin(titulos, linhas) {
  const wrap = Loja.el('div', 'loja-table-wrap'); const table = Loja.el('table', 'loja-table');
  const head = Loja.el('thead'), tr = Loja.el('tr'); titulos.forEach(t => tr.appendChild(Loja.el('th', '', t))); head.appendChild(tr); table.appendChild(head);
  const body = Loja.el('tbody'); linhas.forEach(valores => { const row = Loja.el('tr'); valores.forEach(valor => { const td = Loja.el('td'); if (valor instanceof Node) td.appendChild(valor); else td.textContent = valor ?? ''; row.appendChild(td); }); body.appendChild(row); });
  if (!linhas.length) { const row = Loja.el('tr'), td = Loja.el('td', 'conta-muted', 'Nenhum registro neste período.'); td.colSpan = titulos.length; row.appendChild(td); body.appendChild(row); }
  table.appendChild(body); wrap.appendChild(table); return wrap;
}
function botaoAdmin(texto, fn, classe = 'btn btn-outline btn-sm') { const btn = Loja.el('button', classe, texto); btn.type = 'button'; btn.onclick = () => executarAdmin(fn, btn); return btn; }
function abrirTabAdmin(nome) {
  document.querySelectorAll('.admin-tab').forEach(el => { el.hidden = el.id !== 'tab-' + nome; });
  document.querySelectorAll('[data-tab]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.tab === nome)));
  if (nome === 'pedidos') executarAdmin(carregarPedidosAdmin);
  if (nome === 'cadastros') executarAdmin(carregarCadastrosAdmin);
  if (nome === 'estoque') executarAdmin(carregarEstoqueAdmin);
}
document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAdmin()) return;
  document.querySelectorAll('[data-tab]').forEach(btn => { btn.onclick = () => abrirTabAdmin(btn.dataset.tab); });
  document.getElementById('relatorioForm').onsubmit = event => { event.preventDefault(); executarAdmin(carregarRelatoriosAdmin, event.submitter); };
  document.getElementById('exportarRelatorio').onclick = exportarRelatorioAdmin;
  document.getElementById('produtoBuscaForm').onsubmit = event => { event.preventDefault(); executarAdmin(carregarProdutosAdmin, event.submitter); };
  document.getElementById('novoProduto').onclick = limparProdutoAdmin;
  document.getElementById('produtoForm').onsubmit = salvarProdutoAdmin;
  document.getElementById('estoqueProduto').onchange = () => executarAdmin(carregarEstoqueAdmin);
  document.getElementById('varianteForm').onsubmit = criarVarianteAdmin;
  document.getElementById('movimentoForm').onsubmit = movimentarEstoqueAdmin;
  document.getElementById('expirarReservas').onclick = event => executarAdmin(async () => { await Api.post('/admin/reservas/expirar', {}); await carregarPedidosAdmin(); }, event.target);
  document.getElementById('categoriaForm').onsubmit = salvarCategoriaAdmin;
  document.getElementById('novaCategoria').onclick = () => document.getElementById('categoriaForm').reset();
  abrirTabAdmin('resumo');
  await executarAdmin(async () => {
    const [cat, marcas] = await Promise.all([Api.get('/admin/categorias'), Api.get('/admin/marcas')]);
    adminCategorias = cat.categorias; adminMarcas = marcas.marcas; preencherSelectsAdmin();
    await Promise.all([carregarProdutosAdmin(), carregarRelatoriosAdmin()]);
  });
});
function preencherSelectsAdmin() {
  const categoria = document.getElementById('produtoCategoria'); categoria.replaceChildren();
  adminCategorias.forEach(c => { const opt = Loja.el('option', '', c.nome + (c.ativo ? '' : ' (inativa)')); opt.value = c.codCategoria; categoria.appendChild(opt); });
  const marca = document.getElementById('produtoMarca'); marca.replaceChildren();
  adminMarcas.forEach(m => { const opt = Loja.el('option', '', m.nome); opt.value = m.nome; marca.appendChild(opt); });
}
async function carregarRelatoriosAdmin() {
  const params = new URLSearchParams(); if (valorAdmin('inicio')) params.set('inicio', valorAdmin('inicio')); if (valorAdmin('fim')) params.set('fim', valorAdmin('fim'));
  const [dashboard, mensal, categorias, estoque] = await Promise.all(['dashboard', 'faturamento', 'vendas', 'estoque'].map(rota => Api.get(`/relatorios/${rota}?${params}`)));
  const indicadores = document.getElementById('adminIndicadores'); indicadores.replaceChildren();
  for (const [nome, valor] of [['Produtos ativos', dashboard.produtos], ['Pedidos no período', dashboard.pedidos], ['Valor confirmado (demo)', Loja.moeda(dashboard.faturamento_total)], ['Opções com estoque crítico', dashboard.estoque_critico]]) {
    const card = Loja.el('article', 'admin-metric'); card.append(Loja.el('span', 'conta-muted', nome), Loja.el('strong', '', valor)); indicadores.appendChild(card);
  }
  graficosAdmin.forEach(chart => chart.destroy()); graficosAdmin = [];
  const criar = (id, labels, valores, titulo, tipo) => new Chart(document.getElementById(id), { type: tipo, data: { labels, datasets: [{ label: titulo, data: valores, backgroundColor: ['#3b82f6', '#6366f1', '#14b8a6', '#f59e0b', '#a78bfa'], borderColor: '#60a5fa', borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#a0a0b4' } }, x: { ticks: { color: '#a0a0b4' } } } } });
  graficosAdmin.push(criar('chartMensal', mensal.dados.map(d => d.mes_label), mensal.dados.map(d => Number(d.faturamento)), 'Valor confirmado (R$)', 'line'));
  graficosAdmin.push(criar('chartCategoria', categorias.dados.map(d => d.categoria), categorias.dados.map(d => Number(d.faturamento)), 'Subtotal (R$)', 'bar'));
  const area = document.getElementById('relatorioTabela'); area.replaceChildren();
  area.append(Loja.el('h3', '', 'Dados dos gráficos'), tabelaAdmin(['Mês', 'Pedidos confirmados', 'Valor (demo)'], mensal.dados.map(d => [d.mes_label, d.total_pedidos, Loja.moeda(d.faturamento)])), tabelaAdmin(['Categoria', 'Unidades', 'Subtotal'], categorias.dados.map(d => [d.categoria, d.total_itens, Loja.moeda(d.faturamento)])), Loja.el('h3', 'mt-lg', 'Resumo do estoque'), tabelaAdmin(['Produto', 'Saldo', 'Situação'], estoque.dados.map(d => [d.produto, d.quantidade, d.situacao])));
  dadosRelatorio = [['Mês', 'Pedidos confirmados', 'Valor demonstrativo'], ...mensal.dados.map(d => [d.mes_label, d.total_pedidos, d.faturamento]), [], ['Categoria', 'Unidades', 'Subtotal antes de desconto'], ...categorias.dados.map(d => [d.categoria, d.total_itens, d.faturamento])];
}
function exportarRelatorioAdmin() {
  const csv = dadosRelatorio.map(row => row.map(value => { let str = String(value ?? ''); if (/^[\s]*[=+\-@]/.test(str)) str = "'" + str; return '"' + str.replaceAll('"', '""') + '"'; }).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }));
  const link = Loja.el('a'); link.href = url; link.download = 'sportkicks-relatorios-demo.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function carregarProdutosAdmin() {
  const res = await Api.get(`/admin/produtos?busca=${encodeURIComponent(valorAdmin('produtoBusca'))}`); adminProdutos = res.produtos;
  const area = document.getElementById('adminProdutos'); area.replaceChildren();
  adminProdutos.forEach(p => { const card = Loja.card(p); card.append(Loja.el('p', 'admin-small', `#${p.codProduto} · ${p.ativo ? 'Ativo' : 'Inativo'} · Saldo ${p.estoqueProduto?.quantidade || 0}`), botaoAdmin('Editar', () => editarProdutoAdmin(p)), botaoAdmin(p.ativo ? 'Desativar' : 'Ativar', async () => { await Api.patch(`/admin/produtos/${p.codProduto}`, { ativo: !p.ativo }); await carregarProdutosAdmin(); })); area.appendChild(card); });
  const select = document.getElementById('estoqueProduto'), atual = select.value; select.replaceChildren();
  adminProdutos.forEach(p => { const opt = Loja.el('option', '', p.nome); opt.value = p.codProduto; select.appendChild(opt); });
  if (adminProdutos.some(p => String(p.codProduto) === atual)) select.value = atual;
}
function limparProdutoAdmin() { document.getElementById('produtoForm').reset(); document.getElementById('produtoId').value = ''; document.getElementById('produtoFormTitle').textContent = 'Novo produto'; }
function editarProdutoAdmin(p) {
  limparProdutoAdmin(); const dados = { produtoId: p.codProduto, produtoNome: p.nome, produtoMarca: p.marca, produtoCategoria: p.idCategoria, produtoCodigo: p.codigo_produto, produtoPreco: p.preco, produtoPromo: p.preco_promocional, produtoImagem: p.imagem_url, produtoDescricao: p.descricao };
  const ficha = p.fichaTecnica?.dados || {};
  Object.assign(dados, { fichaPeso: ficha.peso_g, fichaDrop: ficha.drop_mm, fichaPlaca: ficha.placa == null ? '' : String(ficha.placa), fichaAmortecimento: ficha.amortecimento, fichaSuperficie: ficha.superficie, fichaFonte: ficha.fonte });
  const review = (p.midias || []).find(m => m.tipo === 'REVIEW'); dados.produtoReview = review?.url; dados.produtoCredito = review?.credito;
  dados.produtoImagens = (p.midias || []).filter(m => m.tipo === 'IMAGEM').sort((a,b) => a.ordem-b.ordem).map(m => m.url).join('\n');
  for (const [id, valor] of Object.entries(dados)) document.getElementById(id).value = valor ?? '';
  document.getElementById('produtoAtivo').checked = p.ativo; document.getElementById('produtoDestaque').checked = p.destaque;
  [...document.getElementById('fichaFinalidade').options].forEach(opt => { opt.selected = ficha.finalidades?.includes(opt.value) || false; });
  document.getElementById('produtoFormTitle').textContent = `Editar ${p.nome}`; document.getElementById('produtoForm').scrollIntoView({ behavior: 'smooth' });
}
async function salvarProdutoAdmin(event) {
  event.preventDefault(); const campos = document.getElementById('produtoCampos'); campos.disabled = true;
  await executarAdmin(async () => {
    const ficha = {};
    if (valorAdmin('fichaPeso')) ficha.peso_g = Number(valorAdmin('fichaPeso')); if (valorAdmin('fichaDrop')) ficha.drop_mm = Number(valorAdmin('fichaDrop'));
    if (valorAdmin('fichaPlaca')) ficha.placa = valorAdmin('fichaPlaca') === 'true';
    for (const [campo, origem] of [['amortecimento', 'fichaAmortecimento'], ['superficie', 'fichaSuperficie']]) if (valorAdmin(origem)) ficha[campo] = valorAdmin(origem);
    const finalidades = [...document.getElementById('fichaFinalidade').selectedOptions].map(o => o.value); if (finalidades.length) ficha.finalidades = finalidades;
    if (Object.keys(ficha).length) ficha.fonte = valorAdmin('fichaFonte');
    const midias = valorAdmin('produtoImagens').split('\n').map(v => v.trim()).filter(Boolean).map((url, ordem) => ({ tipo: 'IMAGEM', url, titulo: `${valorAdmin('produtoNome')} - Foto ${ordem + 1}` }));
    if (valorAdmin('produtoReview')) midias.push({ tipo: 'REVIEW', url: valorAdmin('produtoReview'), credito: valorAdmin('produtoCredito'), titulo: `Review de ${valorAdmin('produtoNome')}` });
    const dados = { nome: valorAdmin('produtoNome'), marca: valorAdmin('produtoMarca'), idCategoria: Number(valorAdmin('produtoCategoria')), codigo_produto: valorAdmin('produtoCodigo') || undefined, preco: Number(valorAdmin('produtoPreco')), preco_promocional: valorAdmin('produtoPromo') ? Number(valorAdmin('produtoPromo')) : null, imagem_url: valorAdmin('produtoImagem'), descricao: valorAdmin('produtoDescricao'), ativo: document.getElementById('produtoAtivo').checked, destaque: document.getElementById('produtoDestaque').checked, ficha, midias };
    const codigo = valorAdmin('produtoId'); await (codigo ? Api.patch(`/admin/produtos/${codigo}`, dados) : Api.post('/admin/produtos', dados));
    limparProdutoAdmin(); await carregarProdutosAdmin();
  }); campos.disabled = false;
}

async function carregarEstoqueAdmin() {
  if (!valorAdmin('estoqueProduto')) return;
  const res = await Api.get(`/admin/produtos?busca=`);
  const p = res.produtos.find(p => p.codProduto === Number(valorAdmin('estoqueProduto')));
  if (!p) return;
  const variantes = p.variantes || [];
  document.getElementById('adminVariantes').replaceChildren(tabelaAdmin(['SKU', 'Tamanho', 'Cor', 'Saldo', 'Mínimo', 'Disponibilidade'], variantes.map(v => [v.sku, v.tamanho, v.cor, v.quantidade, v.quantidade_minima, botaoAdmin(v.ativo ? 'Desativar' : 'Ativar', async () => { await Api.patch(`/admin/variantes/${v.codVariante}`, { ativo: !v.ativo }); await carregarEstoqueAdmin(); })])));
  for (const destino of ['movimentoVariante', 'movimentoDestino']) {
    const select = document.getElementById(destino); select.replaceChildren();
    variantes.forEach(v => { const opt = Loja.el('option', '', `${v.sku} · ${v.tamanho} · ${v.cor} · saldo ${v.quantidade}`); opt.value = v.codVariante; select.appendChild(opt); });
  }
  const movimentos = await Api.get(`/admin/movimentos?produto=${p.codProduto}`);
  document.getElementById('adminMovimentos').replaceChildren(tabelaAdmin(['Data', 'Operação', 'Variação', 'Saldo da opção', 'Motivo'], movimentos.movimentos.map(m => [new Date(m.criado_em).toLocaleString('pt-BR'), m.tipo, m.quantidade, m.saldo, m.motivo])));
}
async function criarVarianteAdmin(event) {
  event.preventDefault(); await executarAdmin(async () => {
    if (!valorAdmin('estoqueProduto')) throw new Error('Escolha um produto.');
    await Api.post(`/admin/produtos/${valorAdmin('estoqueProduto')}/variantes`, { sku: valorAdmin('varianteSku'), tamanho: valorAdmin('varianteTamanho'), cor: valorAdmin('varianteCor'), quantidade_minima: Number(valorAdmin('varianteMinimo')) });
    document.getElementById('varianteForm').reset(); await carregarEstoqueAdmin();
  }, event.submitter);
}
async function movimentarEstoqueAdmin(event) {
  event.preventDefault(); await executarAdmin(async () => {
    if (!valorAdmin('movimentoVariante')) throw new Error('Escolha uma opção de estoque.');
    await Api.post(`/admin/variantes/${valorAdmin('movimentoVariante')}/movimentos`, { tipo: valorAdmin('movimentoTipo'), quantidade: Number(valorAdmin('movimentoQuantidade')), destino: Number(valorAdmin('movimentoDestino')), motivo: valorAdmin('movimentoMotivo') });
    await carregarEstoqueAdmin(); await carregarProdutosAdmin();
  }, event.submitter);
}

async function carregarPedidosAdmin() {
  const res = await Api.get('/admin/pedidos'); const area = document.getElementById('adminPedidos'); area.replaceChildren();
  if (!res.pedidos.length) area.appendChild(Loja.el('p', 'loja-subtitle', 'Nenhum pedido cadastrado.'));
  const nomes = { PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado', EM_SEPARACAO: 'Em separação', ENVIADO: 'Enviado', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado' };
  const proximos = { PENDENTE: ['CONFIRMADO', 'CANCELADO'], CONFIRMADO: ['EM_SEPARACAO', 'CANCELADO'], EM_SEPARACAO: ['ENVIADO', 'CANCELADO'], ENVIADO: ['ENTREGUE'] };
  res.pedidos.forEach(p => {
    const card = Loja.el('article', 'conta-card admin-order'); const titulo = Loja.el('h3', '', `Pedido #${p.codPedido} · ${nomes[p.status] || p.status}`);
    const cliente = Loja.el('p', 'loja-subtitle', `${p.usuarioPedido?.nome || 'Cliente'} · ${Loja.moeda(p.valorTotal)}`);
    const detalhe = Loja.el('a', 'btn btn-outline btn-sm', 'Abrir detalhes'); detalhe.href = `pedido.html?id=${p.codPedido}`;
    card.append(titulo, cliente, Loja.el('p', 'admin-small', `Pagamento ${p.pagamentoPedido?.provedor || 'não informado'}: ${p.pagamentoPedido?.status || 'pendente'}`), detalhe);
    if (proximos[p.status]) {
      const form = Loja.el('form', 'conta-grid'); const select = Loja.el('select', 'form-control'); select.setAttribute('aria-label', `Próximo status do pedido ${p.codPedido}`);
      proximos[p.status].forEach(s => { const opt = Loja.el('option', '', nomes[s]); opt.value = s; select.appendChild(opt); });
      const btn = Loja.el('button', 'btn btn-primary btn-sm', 'Atualizar status'); btn.type = 'submit';
      form.append(select, btn); form.onsubmit = event => { event.preventDefault(); if (!confirm(`Atualizar o pedido #${p.codPedido} para ${nomes[select.value]}?`)) return; executarAdmin(async () => { await Api.patch(`/pedidos/${p.codPedido}/status`, { status: select.value }); await carregarPedidosAdmin(); }, btn); }; card.appendChild(form);
    }
    if (p.pagamentoPedido?.status === 'APROVADO') card.appendChild(botaoAdmin('Simular estorno (sem dinheiro real)', async () => {
      if (!confirm('Confirmar o estorno de demonstração? Se o pedido ainda não foi enviado, o estoque será devolvido.')) return;
      await Api.post(`/pagamentos/${p.codPedido}/reembolsar-demo`, { confirmarDemonstracao: true }); await carregarPedidosAdmin();
    }));
    if (p.entregaPedido) {
      const entrega = Loja.el('form', 'conta-grid'); const rastreio = Loja.el('input', 'form-control'); rastreio.placeholder = 'Código de rastreio'; rastreio.value = p.entregaPedido.codigo_rastreio || ''; rastreio.maxLength = 50; rastreio.setAttribute('aria-label', `Rastreio do pedido ${p.codPedido}`);
      const transportadora = Loja.el('input', 'form-control'); transportadora.placeholder = 'Transportadora'; transportadora.value = p.entregaPedido.transportadora || ''; transportadora.maxLength = 100; transportadora.setAttribute('aria-label', `Transportadora do pedido ${p.codPedido}`);
      const previsao = Loja.el('input', 'form-control'); previsao.type = 'date'; previsao.value = p.entregaPedido.data_previsao || ''; previsao.setAttribute('aria-label', `Previsão de entrega do pedido ${p.codPedido}`);
      const statusEntrega = Loja.el('select', 'form-control'); statusEntrega.setAttribute('aria-label', `Status de entrega do pedido ${p.codPedido}`);
      ['PENDENTE', 'EM_TRANSITO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'TENTATIVA_FALHA', 'DEVOLVIDO'].forEach(s => { const opt = Loja.el('option', '', s.replaceAll('_',' ')); opt.value = s; statusEntrega.appendChild(opt); }); statusEntrega.value = p.entregaPedido.status;
      const salvar = Loja.el('button', 'btn btn-outline btn-sm', 'Salvar entrega'); salvar.type = 'submit'; entrega.append(rastreio, transportadora, previsao, statusEntrega, salvar);
      entrega.onsubmit = event => { event.preventDefault(); executarAdmin(async () => { await Api.patch(`/entregas/${p.entregaPedido.codEntrega}/status`, { codigo_rastreio: rastreio.value, transportadora: transportadora.value, data_previsao: previsao.value || null, status: statusEntrega.value }); await carregarPedidosAdmin(); }, salvar); }; card.appendChild(entrega);
    }
    area.appendChild(card);
  });
}

async function salvarCategoriaAdmin(event) {
  event.preventDefault(); await executarAdmin(async () => {
    const codigo = valorAdmin('categoriaId'), dados = { nome: valorAdmin('categoriaNome'), icone: valorAdmin('categoriaIcone') };
    await (codigo ? Api.patch(`/admin/categorias/${codigo}`, dados) : Api.post('/admin/categorias', dados));
    document.getElementById('categoriaForm').reset(); await carregarCadastrosAdmin();
  }, event.submitter);
}
async function carregarCadastrosAdmin() {
  const [categorias, marcas, avaliacoes, usuarios] = await Promise.all(['categorias', 'marcas', 'avaliacoes', 'usuarios'].map(rota => Api.get('/admin/' + rota)));
  adminCategorias = categorias.categorias; adminMarcas = marcas.marcas; preencherSelectsAdmin();
  const cat = document.getElementById('adminCategorias'); cat.replaceChildren();
  categorias.categorias.forEach(c => { const row = Loja.el('div', 'admin-row'); row.append(Loja.el('h4', '', c.nome), botaoAdmin('Editar', () => { document.getElementById('categoriaId').value = c.codCategoria; document.getElementById('categoriaNome').value = c.nome; document.getElementById('categoriaIcone').value = c.icone || ''; }), botaoAdmin(c.ativo ? 'Desativar' : 'Ativar', async () => { await Api.patch(`/admin/categorias/${c.codCategoria}`, { ativo: !c.ativo }); await carregarCadastrosAdmin(); })); cat.appendChild(row); });
  const brandArea = document.getElementById('adminMarcas'); brandArea.replaceChildren();
  marcas.marcas.forEach(m => {
    const form = Loja.el('form', 'admin-row'); form.appendChild(Loja.el('h4', '', m.nome));
    const descricao = Loja.el('textarea', 'form-control'); descricao.value = m.descricao; descricao.maxLength = 2000; descricao.setAttribute('aria-label', `Descrição de ${m.nome}`);
    const site = Loja.el('input', 'form-control'); site.type = 'url'; site.value = m.site_url; site.setAttribute('aria-label', `Site de ${m.nome}`);
    const contato = Loja.el('input', 'form-control'); contato.type = 'url'; contato.value = m.contato_url; contato.setAttribute('aria-label', `Atendimento de ${m.nome}`);
    const btn = Loja.el('button', 'btn btn-outline btn-sm', 'Salvar marca'); btn.type = 'submit'; form.append(descricao, site, contato, btn);
    form.onsubmit = event => { event.preventDefault(); executarAdmin(() => Api.patch(`/admin/marcas/${m.codMarca}`, { descricao: descricao.value, site_url: site.value, contato_url: contato.value }), btn); }; brandArea.appendChild(form);
  });
  const reviews = document.getElementById('adminAvaliacoes'); reviews.replaceChildren();
  if (!avaliacoes.avaliacoes.length) reviews.appendChild(Loja.el('p', 'loja-subtitle', 'Nenhuma avaliação recebida.'));
  avaliacoes.avaliacoes.forEach(a => { const card = Loja.el('article', 'admin-row'); card.append(Loja.el('h4', '', `${a.produto.nome} · ${a.nota}/5`), Loja.el('p', '', a.comentario), botaoAdmin(a.visivel ? 'Ocultar avaliação' : 'Exibir avaliação', async () => { await Api.patch(`/admin/avaliacoes/${a.codAvaliacao}`, { visivel: !a.visivel }); await carregarCadastrosAdmin(); })); reviews.appendChild(card); });
  const pessoas = document.getElementById('adminUsuarios'); pessoas.replaceChildren();
  usuarios.usuarios.forEach(u => {
    const form = Loja.el('form', 'admin-row'); form.appendChild(Loja.el('h4', '', `${u.nome} · ${u.email}`));
    const tipo = Loja.el('select', 'form-control'); tipo.setAttribute('aria-label', `Tipo de conta de ${u.nome}`); ['CLIENTE','ADMIN'].forEach(v => { const opt = Loja.el('option', '', v); opt.value = v; tipo.appendChild(opt); }); tipo.value = u.tipo_usuario;
    const ativo = Loja.el('input'); ativo.type = 'checkbox'; ativo.checked = u.ativo; const label = Loja.el('label', '', ' Conta ativa '); label.prepend(ativo);
    const btn = Loja.el('button', 'btn btn-outline btn-sm', 'Salvar acesso'); btn.type = 'submit'; form.append(tipo, label, btn);
    form.onsubmit = event => { event.preventDefault(); if (!confirm(`Alterar o acesso de ${u.nome}?`)) return; executarAdmin(async () => { await Api.patch(`/admin/usuarios/${u.codUsuario}/acesso`, { ativo: ativo.checked, tipo_usuario: tipo.value }); await carregarCadastrosAdmin(); }, btn); }; pessoas.appendChild(form);
  });
}
