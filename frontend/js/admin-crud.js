/* Formulários administrativos ligados aos mesmos cadastros usados pela loja. */
window.GestaoAdmin = (() => {
  const tipos = {
    produtos: { singular: 'produto', plural: 'Produtos', chave: 'codProduto', lista: '/admin/produtos', obter: '/admin/produtos', retorno: 'produtos', nome: 'Nome do produto' },
    categorias: { singular: 'categoria', plural: 'Categorias', chave: 'codCategoria', lista: '/admin/categorias', retorno: 'categorias', nome: 'Nome da categoria' },
    usuarios: { singular: 'usuário', plural: 'Usuários', chave: 'codUsuario', lista: '/usuarios', retorno: 'usuarios', nome: 'Nome do usuário' },
    estoque: { singular: 'estoque', plural: 'Estoque', chave: 'codEstoque', lista: '/estoque', retorno: 'estoque', nome: 'Nome do produto' },
    pedidos: { singular: 'pedido', plural: 'Pedidos', chave: 'codPedido', lista: '/pedidos', retorno: 'pedidos', nome: 'Nome do cliente' },
    entregas: { singular: 'entrega', plural: 'Entregas', chave: 'codEntrega', lista: '/entregas', retorno: 'entregas', nome: 'Nome do cliente' },
    'itens-pedido': { singular: 'item do pedido', plural: 'Itens do pedido', chave: 'codItemPedido', lista: '/itens-pedido', retorno: 'itens', nome: 'Nome do produto' }
  };
  const estado = { entidade: 'produtos', registros: [], registro: null, referencias: null, campos: [], inicial: {}, sequencia: 0, ocupado: false, chaveCheckout: null };
  const el = id => document.getElementById(id);
  const tipo = () => tipos[estado.entidade];
  const pagamento = [['PIX', 'Pix'], ['CARTAO_CREDITO', 'Cartão de crédito'], ['CARTAO_DEBITO', 'Cartão de débito'], ['BOLETO', 'Boleto']];
  const situacao = valor => valor == null ? 'Não informado' : String(valor).replaceAll('_', ' ');
  const endereco = [['cep', 'CEP', 10], ['rua', 'Rua', 200], ['numero', 'Número', 20], ['complemento', 'Complemento', 100], ['bairro', 'Bairro', 100], ['cidade', 'Cidade', 100], ['estado', 'UF', 2]];

  function mensagem(texto = '', erro = false) {
    const area = el('gestaoMensagem'); area.textContent = texto; area.hidden = !texto;
    area.className = `conta-message conta-message-${erro ? 'error' : 'success'}`;
  }
  function tratarErro(erro) {
    if (erro.status === 401) { Auth.clearSession(); Auth.requireAuth(); }
    mensagem(erro.message || 'Não foi possível concluir a operação.', true);
    el('gestaoMensagem').scrollIntoView({ block: 'center' });
    el('gestaoMensagem').focus({ preventScroll: true });
  }
  async function executar(fn, botao) {
    if (estado.ocupado) return;
    estado.ocupado = true;
    if (botao) botao.disabled = true;
    el('gestaoCampos').disabled = true;
    el('gestaoCancelar').disabled = true;
    el('gestaoEntidade').disabled = true;
    try { await fn(); } catch (erro) { tratarErro(erro); }
    finally { estado.ocupado = false; if (botao) botao.disabled = false; el('gestaoCampos').disabled = false; el('gestaoCancelar').disabled = false; el('gestaoEntidade').disabled = false; }
  }
  async function referencias() {
    if (!estado.referencias) {
      const [produtos, categorias, usuarios, pedidos] = await Promise.all([Api.get('/admin/produtos'), Api.get('/admin/categorias'), Api.get('/usuarios'), Api.get('/pedidos')]);
      estado.referencias = { produtos: produtos.produtos, categorias: categorias.categorias, usuarios: usuarios.usuarios, pedidos: pedidos.pedidos };
    }
    return estado.referencias;
  }
  function fecharEditor() {
    el('gestaoEditor').hidden = true; estado.registro = null;
    el('gestaoForm').reset(); el('gestaoCamposGrid').replaceChildren(); el('gestaoItens').replaceChildren();
  }
  function ajustarBusca() {
    const codigo = el('gestaoCriterio').value === 'codigo';
    el('gestaoTermoLabel').textContent = codigo ? 'Código do registro' : tipo().nome;
    el('gestaoTermo').inputMode = codigo ? 'numeric' : 'text';
    el('gestaoTermo').placeholder = codigo ? 'Ex.: 12' : 'Digite para consultar';
  }
  async function listar() {
    mensagem();
    const chamada = ++estado.sequencia, entidade = estado.entidade, cfg = tipo();
    const termo = el('gestaoTermo').value.trim();
    el('gestaoResultados').setAttribute('aria-busy', 'true'); el('gestaoContagem').textContent = 'Consultando registros…';
    try {
      let registros;
      if (termo && el('gestaoCriterio').value === 'codigo') {
        if (!/^[1-9]\d*$/.test(termo) || Number(termo) > 2147483647) throw new Error('Informe um código inteiro positivo.');
        try { registros = [await Api.get(`${cfg.obter || '/' + entidade}/${termo}`)]; }
        catch (erro) { if (erro.status === 404) registros = []; else throw erro; }
      } else {
        const rota = termo ? entidade === 'produtos' ? `/admin/produtos?busca=${encodeURIComponent(termo)}` : `/${entidade}/buscar?nome=${encodeURIComponent(termo)}` : cfg.lista;
        registros = (await Api.get(rota))[cfg.retorno];
      }
      if (chamada !== estado.sequencia) return;
      estado.registros = registros;
      renderizarLista();
      el('gestaoContagem').textContent = `${registros.length} registro(s) encontrado(s).${entidade === 'produtos' ? ' Até 100 por consulta; use a busca para localizar outros.' : ''}`;
    } catch (erro) {
      if (chamada !== estado.sequencia) return;
      el('gestaoResultados').replaceChildren(Loja.el('p', 'conta-message conta-message-error', 'Não foi possível carregar os registros. Use Recarregar lista para tentar novamente.'));
      el('gestaoContagem').textContent = 'Consulta não concluída.';
      throw erro;
    } finally { if (chamada === estado.sequencia) el('gestaoResultados').setAttribute('aria-busy', 'false'); }
  }
  function nomeRegistro(r) {
    if (r.nome) return r.nome;
    if (estado.entidade === 'estoque') return r.produtoEstoque?.nome || `Produto #${r.idProduto}`;
    if (estado.entidade === 'itens-pedido') return r.nome_produto || r.produtoItem?.nome || `Produto #${r.idProduto}`;
    if (estado.entidade === 'pedidos') return r.usuarioPedido?.nome || `Cliente #${r.idUsuario}`;
    return `Pedido #${r.idPedido}`;
  }
  function resumoRegistro(r) {
    switch (estado.entidade) {
      case 'produtos': return Loja.moeda(r.preco_promocional ?? r.preco);
      case 'categorias': return r.descricao || 'Sem descrição';
      case 'usuarios': return `${r.email} · ${r.tipo_usuario}`;
      case 'estoque': return `${r.quantidade} unidade(s) · mínimo ${r.quantidade_minima}`;
      case 'pedidos': return Loja.moeda(r.valorTotal);
      case 'entregas': return r.codigo_rastreio || 'Sem rastreio';
      default: return `Pedido #${r.idPedido} · ${r.quantidade} unidade(s) · ${Loja.moeda(r.subtotal)}`;
    }
  }
  function botao(texto, fn, perigo = false) {
    const btn = Loja.el('button', `btn btn-outline btn-sm${perigo ? ' admin-gestao-danger' : ''}`, texto);
    btn.type = 'button'; btn.onclick = () => executar(fn, btn); return btn;
  }
  function renderizarLista() {
    if (!estado.registros.length) { el('gestaoResultados').replaceChildren(Loja.el('p', 'conta-message conta-message-info', 'Nenhum registro encontrado para esta consulta.')); return; }
    const linhas = estado.registros.map(r => {
      const id = r[tipo().chave], acoes = Loja.el('div', 'admin-gestao-actions');
      acoes.append(botao('Consultar', async () => detalhes(await obter(id))), botao('Editar', async () => editar(await obter(id))));
      if (['produtos', 'categorias', 'usuarios'].includes(estado.entidade) && !r.ativo) {
        acoes.append(botao('Reativar', async () => {
          if (!confirm(`Reativar ${tipo().singular} #${id}?`)) return;
          await (estado.entidade === 'usuarios' ? Api.patch(`/admin/usuarios/${id}/acesso`, { ativo: true, tipo_usuario: r.tipo_usuario }) : Api.patch(`/${estado.entidade}/${id}`, { ativo: true }));
          await atualizarAposSalvar('Registro reativado.');
        }));
      } else acoes.append(botao(['produtos', 'categorias', 'usuarios'].includes(estado.entidade) ? 'Desativar' : 'Excluir', () => excluir(r), true));
      return [`#${id}`, nomeRegistro(r), r.ativo !== undefined ? r.ativo ? 'Ativo' : 'Inativo' : situacao(r.status), resumoRegistro(r), acoes];
    });
    el('gestaoResultados').replaceChildren(tabelaAdmin(['Código', 'Nome / referência', 'Situação', 'Resumo', 'Ações'], linhas));
  }
  async function obter(codigo) { return Api.get(`${tipo().obter || '/' + estado.entidade}/${codigo}`); }

  function campo(meta, registro) {
    const wrap = Loja.el('div', meta.largo ? 'conta-wide' : '');
    const label = Loja.el('label', 'form-label', meta.label); label.htmlFor = `gestao-${meta.key}`;
    const input = Loja.el(meta.opcoes ? 'select' : meta.tipo === 'textarea' ? 'textarea' : 'input', 'form-control');
    input.id = label.htmlFor; input.name = meta.key;
    if (meta.opcoes) {
      const vazio = Loja.el('option', '', 'Selecione…'); vazio.value = ''; input.append(vazio);
      meta.opcoes.forEach(([valor, nome]) => { const opt = Loja.el('option', '', nome); opt.value = valor; input.append(opt); });
    } else if (meta.tipo !== 'textarea') input.type = meta.tipo || 'text';
    else input.rows = 3;
    const valor = registro[meta.key] ?? meta.padrao ?? '';
    if (meta.tipo === 'checkbox') { input.checked = Boolean(valor); input.className = ''; }
    else {
      if (meta.opcoes && valor !== '' && ![...input.options].some(o => o.value === String(valor))) { const opt = Loja.el('option', '', `Registro #${valor}`); opt.value = valor; input.append(opt); }
      input.value = valor;
    }
    input.required = Boolean(meta.obrigatorio);
    if (meta.max) input.maxLength = meta.max;
    if (meta.min !== undefined) input.min = meta.min;
    if (meta.maxNumero !== undefined) input.max = meta.maxNumero;
    if (meta.step) input.step = meta.step;
    if (meta.fixo) input.disabled = true;
    if (meta.leitura) input.readOnly = true;
    if (meta.tipo === 'password') { input.autocomplete = meta.key === 'senha_atual' ? 'current-password' : 'new-password'; input.minLength = meta.key === 'senha' ? 8 : 0; }
    wrap.append(label, input);
    if (meta.ajuda) wrap.append(Loja.el('p', 'admin-gestao-help', meta.ajuda));
    el('gestaoCamposGrid').append(wrap); estado.campos.push({ meta, input }); return input;
  }
  function opcoesPedidos(novo, atual) {
    return estado.referencias.pedidos.filter(p => p.status === 'PENDENTE' || p.codPedido === atual).filter(p => !novo || !p.entregaPedido).map(p => [p.codPedido, `#${p.codPedido} · ${p.usuarioPedido?.nome || 'Cliente'} · ${situacao(p.status)}`]);
  }
  async function editar(registro = null) {
    if (estado.entidade === 'produtos') {
      abrirTabAdmin('catalogo');
      if (registro) editarProdutoAdmin(registro); else limparProdutoAdmin();
      el('produtoForm').scrollIntoView({ block: 'start' }); el('produtoNome').focus(); return;
    }
    await referencias();
    const produtosVinculados = [...new Set([registro?.idProduto, ...(registro?.itensPedido || []).map(item => item.idProduto)].filter(Boolean))];
    for (const codigo of produtosVinculados) if (!estado.referencias.produtos.some(p => p.codProduto === codigo)) estado.referencias.produtos.push(await Api.get(`/admin/produtos/${codigo}`));
    fecharEditor(); estado.registro = registro; estado.campos = [];
    estado.chaveCheckout = crypto.randomUUID();
    const novo = !registro, dados = registro || {}, entidade = estado.entidade;
    el('gestaoEditorTitulo').textContent = novo ? `Cadastrar ${tipo().singular}` : `Editar ${tipo().singular} #${dados[tipo().chave]}`;
    el('gestaoEditorAjuda').textContent = {
      categorias: 'Uma categoria com produtos ativos não pode ser desativada.',
      usuarios: 'O cadastro de outra pessoa mantém sua sessão de administrador. Privilégios são gerenciados na seção Cadastros. Para alterar suas próprias credenciais, informe a senha atual.',
      estoque: 'Produtos com opções têm o saldo controlado por tamanho e cor. O estoque mínimo pode ser alterado aqui.',
      pedidos: novo ? 'Selecione o cliente e confira o endereço. Pagamento apenas de demonstração.' : 'Só edite pedidos pendentes, com reserva ativa e sem pagamento processado. Salvar cadastro completo substitui a lista de itens.',
      entregas: 'Cada pedido tem uma entrega. Só altere o endereço enquanto o pedido estiver pendente.',
      'itens-pedido': 'Alterações só são permitidas em pedidos pendentes. O preço e os totais são calculados pelo servidor.'
    }[entidade];
    el('gestaoSalvar').textContent = novo ? 'Cadastrar registro' : 'Salvar alterações';
    el('gestaoSalvarCompleto').hidden = novo;
    el('gestaoCalcular').hidden = entidade !== 'pedidos' || !novo;
    el('gestaoTotais').hidden = true;
    el('gestaoItensArea').hidden = !['pedidos', 'itens-pedido'].includes(entidade);
    el('gestaoAdicionarItem').hidden = entidade !== 'pedidos';
    el('gestaoItensArea').querySelector('h4').textContent = entidade === 'itens-pedido' ? 'Produto do item' : 'Itens do pedido';
    if (entidade === 'categorias') {
      campo({ key: 'nome', label: 'Nome da categoria', obrigatorio: true, max: 80 }, dados);
      campo({ key: 'icone', label: 'Ícone (opcional)', max: 50, nulo: true }, dados);
      campo({ key: 'descricao', label: 'Descrição', tipo: 'textarea', largo: true, max: 2000, nulo: true }, dados);
      if (!novo) campo({ key: 'ativo', label: 'Categoria ativa', tipo: 'checkbox' }, dados);
    }
    if (entidade === 'usuarios') {
      for (const [key, label, max] of [['nome', 'Nome completo', 100], ['email', 'E-mail', 150], ['cpf', 'CPF', 14], ['telefone', 'Telefone com DDD', 20]]) campo({ key, label, max, tipo: key === 'email' ? 'email' : 'text', obrigatorio: key !== 'telefone' }, dados);
      campo({ key: 'senha', label: novo ? 'Senha inicial (mínimo 8 caracteres)' : 'Nova senha (deixe vazio para manter)', tipo: 'password', obrigatorio: novo }, {});
      if (!novo && Number(Auth.getUser()?.id ?? Auth.getUser()?.codUsuario) === dados.codUsuario) campo({ key: 'senha_atual', label: 'Sua senha atual (ao alterar suas credenciais)', tipo: 'password' }, {});
      for (const [key, label, max] of endereco) campo({ key, label, max, obrigatorio: novo && key !== 'complemento' }, dados);
    }
    if (entidade === 'estoque') {
      campo({ key: 'idProduto', label: 'Produto', numero: true, opcoes: estado.referencias.produtos.map(p => [p.codProduto, `${p.nome} · #${p.codProduto}`]), obrigatorio: true, fixo: !novo }, dados);
      const produto = estado.referencias.produtos.find(p => p.codProduto === dados.idProduto);
      campo({ key: 'quantidade', label: 'Quantidade disponível', tipo: 'number', numero: true, min: 0, maxNumero: 1000000, step: 1, padrao: 0, obrigatorio: true, leitura: Boolean(produto?.variantes?.length), ajuda: produto?.variantes?.length ? 'Use a seção Estoque para movimentar cada tamanho e cor.' : '' }, dados);
      campo({ key: 'quantidade_minima', label: 'Estoque mínimo', tipo: 'number', numero: true, min: 0, maxNumero: 1000000, step: 1, padrao: 5, obrigatorio: true }, dados);
    }
    if (entidade === 'pedidos') {
      if (novo) {
        const select = campo({ key: 'idUsuario', label: 'Cliente', numero: true, opcoes: estado.referencias.usuarios.filter(u => u.ativo).map(u => [u.codUsuario, `${u.nome} · ${u.email}`]), obrigatorio: true }, {});
        select.onchange = () => preencherEndereco(Number(select.value));
      }
      campo({ key: 'forma_pagamento', label: 'Forma de pagamento', opcoes: pagamento, obrigatorio: true, padrao: 'PIX' }, dados);
      campo({ key: 'observacoes', label: 'Observações do pedido', tipo: 'textarea', largo: true, max: 2000, nulo: true }, dados);
      if (novo) for (const [key, label, max] of endereco) campo({ key: `endereco_${key}`, label: `Entrega: ${label}`, max, obrigatorio: key !== 'complemento' }, {});
      for (const item of dados.itensPedido || [{}]) adicionarItem(item);
      if (!novo) mostrarTotais(dados, 'Valores atuais');
    }
    if (entidade === 'itens-pedido') {
      campo({ key: 'idPedido', label: 'Pedido', numero: true, opcoes: opcoesPedidos(false, dados.idPedido), obrigatorio: true, fixo: !novo }, dados);
      adicionarItem(dados);
    }
    if (entidade === 'entregas') {
      campo({ key: 'idPedido', label: 'Pedido', numero: true, opcoes: opcoesPedidos(novo, dados.idPedido), obrigatorio: true, fixo: !novo }, dados);
      campo({ key: 'status', label: 'Situação da entrega', opcoes: ['PENDENTE', 'EM_TRANSITO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'TENTATIVA_FALHA', 'DEVOLVIDO'].map(s => [s, situacao(s)]), padrao: 'PENDENTE', obrigatorio: true }, dados);
      const pedido = estado.referencias.pedidos.find(p => p.codPedido === dados.idPedido);
      campo({ key: 'endereco_entrega', label: 'Endereço completo de entrega', tipo: 'textarea', largo: true, obrigatorio: true, max: 300, leitura: !novo && pedido?.status !== 'PENDENTE' }, dados);
      campo({ key: 'cep_entrega', label: 'CEP da entrega', max: 10, nulo: true, leitura: !novo && pedido?.status !== 'PENDENTE' }, dados);
      for (const [key, label, max] of [['codigo_rastreio', 'Código de rastreio', 50], ['transportadora', 'Transportadora', 100]]) campo({ key, label, max, nulo: true }, dados);
      for (const [key, label] of [['data_previsao', 'Previsão de entrega'], ['data_entrega', 'Data da entrega']]) campo({ key, label, tipo: 'date', nulo: true }, dados);
      campo({ key: 'observacoes', label: 'Observações da entrega', tipo: 'textarea', largo: true, max: 1000, nulo: true }, dados);
    }
    estado.inicial = coletar();
    el('gestaoEditor').hidden = false; el('gestaoDetalhes').hidden = true;
    el('gestaoEditor').scrollIntoView({ block: 'start' });
    requestAnimationFrame(() => el('gestaoCamposGrid').querySelector('input:not([disabled]),select:not([disabled]),textarea')?.focus({ preventScroll: true }));
    mensagem();
  }
  function preencherEndereco(codigo) {
    const usuario = estado.referencias.usuarios.find(u => u.codUsuario === codigo);
    for (const [key] of endereco) el(`gestao-endereco_${key}`).value = usuario?.[key] || '';
  }
  function adicionarItem(original = {}) {
    const indice = el('gestaoItens').children.length + 1;
    const row = Loja.el('div', 'admin-gestao-item'); row.itemOriginal = original;
    const selectProduto = Loja.el('select', 'form-control'); selectProduto.classList.add('gestao-item-produto'); selectProduto.required = true;
    const vazio = Loja.el('option', '', 'Selecione o produto'); vazio.value = ''; selectProduto.append(vazio);
    estado.referencias.produtos.forEach(p => { const opt = Loja.el('option', '', `${p.nome} · #${p.codProduto}`); opt.value = p.codProduto; selectProduto.append(opt); });
    if (original.idProduto && ![...selectProduto.options].some(o => Number(o.value) === original.idProduto)) { const opt = Loja.el('option', '', original.nome_produto || `Produto #${original.idProduto}`); opt.value = original.idProduto; selectProduto.append(opt); }
    selectProduto.value = original.idProduto || '';
    const selectVariante = Loja.el('select', 'form-control'); selectVariante.classList.add('gestao-item-variante');
    const quantidade = Loja.el('input', 'form-control'); quantidade.classList.add('gestao-item-quantidade'); quantidade.type = 'number'; quantidade.min = 1; quantidade.max = 999; quantidade.step = 1; quantidade.value = original.quantidade || 1; quantidade.required = true;
    for (const [nome, input] of [['Produto', selectProduto], ['Tamanho e cor', selectVariante], ['Quantidade', quantidade]]) {
      const wrap = Loja.el('div'), label = Loja.el('label', 'form-label', nome);
      input.id = `gestao-item-${crypto.randomUUID()}`; label.htmlFor = input.id; input.setAttribute('aria-label', `${nome} do item ${indice}`); wrap.append(label, input); row.append(wrap);
    }
    const atualizarOpcoes = codigo => {
      selectVariante.replaceChildren();
      const produto = estado.referencias.produtos.find(p => p.codProduto === Number(selectProduto.value));
      const variantes = produto?.variantes || [];
      const opt = Loja.el('option', '', variantes.length ? 'Selecione tamanho e cor' : 'Sem opção específica'); opt.value = ''; selectVariante.append(opt);
      variantes.filter(v => v.ativo || v.codVariante === codigo).forEach(v => { const option = Loja.el('option', '', `${v.tamanho} · ${v.cor} · saldo ${v.quantidade}${v.ativo ? '' : ' (inativa)'}`); option.value = v.codVariante; selectVariante.append(option); });
      selectVariante.required = Boolean(variantes.length);
      selectVariante.value = codigo || (variantes.length === 1 && variantes[0].legado ? variantes[0].codVariante : '');
    };
    selectProduto.onchange = () => { row.itemOriginal = {}; atualizarOpcoes(null); };
    atualizarOpcoes(original.idVariante);
    const remover = Loja.el('button', 'btn btn-outline btn-sm admin-gestao-danger', 'Remover item'); remover.type = 'button'; remover.classList.add('gestao-remover-item');
    remover.onclick = () => { row.remove(); atualizarRemocoes(); };
    row.append(remover); el('gestaoItens').append(row); atualizarRemocoes();
  }
  function atualizarRemocoes() { const botoes = el('gestaoItens').querySelectorAll('.gestao-remover-item'); botoes.forEach(b => { b.disabled = botoes.length <= 1; b.hidden = estado.entidade === 'itens-pedido'; }); }
  function lerItens() {
    return [...el('gestaoItens').children].map(row => {
      const idVariante = Number(row.querySelector('.gestao-item-variante').value) || null;
      return { idProduto: Number(row.querySelector('.gestao-item-produto').value), idVariante, quantidade: Number(row.querySelector('.gestao-item-quantidade').value), ...(!idVariante ? { tamanho: row.itemOriginal.tamanho || null, cor: row.itemOriginal.cor || null } : {}) };
    });
  }
  function coletar() {
    const dados = {};
    for (const { meta, input } of estado.campos) {
      let valor = meta.tipo === 'checkbox' ? input.checked : input.value.trim();
      if (meta.tipo === 'password' && !valor) continue;
      if (meta.numero) valor = valor === '' ? null : Number(valor);
      else if (meta.nulo && valor === '') valor = null;
      dados[meta.key] = valor;
    }
    if (estado.entidade === 'estoque' && estado.registro) delete dados.idProduto;
    if (estado.entidade === 'pedidos') {
      dados.itens = lerItens();
      if (!estado.registro) {
        dados.endereco_entrega = {};
        for (const [key] of endereco) { dados.endereco_entrega[key] = dados[`endereco_${key}`]; delete dados[`endereco_${key}`]; }
      }
    }
    if (estado.entidade === 'itens-pedido') Object.assign(dados, lerItens()[0]);
    return dados;
  }
  function mostrarTotais(dados, prefixo) {
    el('gestaoTotais').textContent = `${prefixo}: subtotal ${Loja.moeda(dados.valorSubtotal)} · desconto ${Loja.moeda(dados.valorDesconto)} · frete ${Loja.moeda(dados.valorFrete)} · total ${Loja.moeda(dados.valorTotal)}. Alterações de itens serão recalculadas ao salvar.`;
    el('gestaoTotais').hidden = false;
  }
  async function salvar(event) {
    event.preventDefault();
    const completo = event.submitter?.value === 'completo';
    await executar(async () => {
      let dados = coletar();
      const novo = !estado.registro, entidade = estado.entidade;
      if (!novo && !completo) {
        if (entidade === 'usuarios' && (dados.email !== estado.inicial.email || dados.cpf !== estado.inicial.cpf)) throw new Error('Para alterar e-mail ou CPF, use Salvar cadastro completo.');
        dados = Object.fromEntries(Object.entries(dados).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(estado.inicial[key])));
        if (!Object.keys(dados).length) throw new Error('Nenhum campo foi alterado.');
      }
      let resposta;
      if (novo) {
        if (entidade === 'pedidos') dados.chaveCheckout = estado.chaveCheckout;
        resposta = await Api.post(entidade === 'pedidos' ? '/admin/pedidos' : `/${entidade}`, dados);
      } else resposta = await Api[completo ? 'put' : 'patch'](`/${entidade}/${estado.registro[tipo().chave]}`, dados);
      if (resposta.reautenticar) { Auth.clearSession(); Auth.requireAuth(); return; }
      if (entidade === 'usuarios' && estado.registro?.codUsuario === Number(Auth.getUser()?.id ?? Auth.getUser()?.codUsuario)) {
        const atual = Auth.getUser(); Auth.setToken(Auth.getToken(), { ...atual, nome: resposta.usuario.nome, email: resposta.usuario.email });
      }
      fecharEditor();
      await atualizarAposSalvar(novo ? 'Registro cadastrado.' : 'Registro atualizado.');
      const retornado = resposta.pedido || resposta.entrega || resposta.item || resposta.categoria || resposta.usuario || resposta.estoque;
      if (retornado && !('token' in resposta)) detalhes(retornado);
    }, event.submitter);
  }
  async function atualizarAposSalvar(texto) {
    estado.referencias = null;
    try { await listar(); mensagem(texto); }
    catch (erro) { mensagem(`${texto} A lista não pôde ser atualizada: ${erro.message || 'falha de conexão'}. Use Recarregar lista.`, true); }
  }
  async function excluir(registro) {
    const id = registro[tipo().chave], entidade = estado.entidade;
    const aviso = {
      produtos: 'O produto será retirado do catálogo.', categorias: 'A categoria será desativada.', usuarios: 'A conta será desativada.',
      estoque: 'O registro precisa estar zerado, sem variantes e sem itens de pedidos vinculados.',
      pedidos: 'O pedido e seus itens, entrega e pagamento pendente serão removidos. O estoque será devolvido uma única vez.',
      entregas: 'A entrega pendente será removida. Você poderá cadastrá-la novamente.',
      'itens-pedido': 'O item será removido, com devolução de estoque e recálculo dos totais. O pedido precisa manter outro item.'
    }[entidade];
    if (!confirm(`${['produtos', 'categorias', 'usuarios'].includes(entidade) ? 'Desativar' : 'Excluir'} ${tipo().singular} #${id}? ${aviso}`)) return;
    await Api.delete(`/${entidade}/${id}`);
    fecharEditor(); el('gestaoDetalhes').hidden = true;
    await atualizarAposSalvar(['produtos', 'categorias', 'usuarios'].includes(entidade) ? 'Registro desativado.' : 'Registro excluído.');
  }
  function detalhes(registro) {
    const area = el('gestaoDetalhesConteudo'); area.replaceChildren();
    el('gestaoDetalhesTitulo').textContent = `${tipo().plural} · #${registro[tipo().chave]}`;
    const campos = { nome: 'Nome', email: 'E-mail', cpf: 'CPF', telefone: 'Telefone', tipo_usuario: 'Tipo de conta', ativo: 'Ativo', marca: 'Marca', codigo_produto: 'Código do produto', descricao: 'Descrição', preco: 'Preço', preco_promocional: 'Preço promocional', idCategoria: 'Código da categoria', idProduto: 'Código do produto', idUsuario: 'Código do cliente', idPedido: 'Código do pedido', idVariante: 'Código da opção', status: 'Situação', forma_pagamento: 'Forma de pagamento', dataPedido: 'Data do pedido', quantidade: 'Quantidade', quantidade_minima: 'Estoque mínimo', tamanho: 'Tamanho', cor: 'Cor', nome_produto: 'Produto', preco_unitario: 'Preço unitário', subtotal: 'Subtotal do item', valorSubtotal: 'Subtotal', valorDesconto: 'Desconto', valorFrete: 'Frete', valorTotal: 'Total', endereco_entrega: 'Endereço da entrega', cep_entrega: 'CEP da entrega', codigo_rastreio: 'Rastreio', transportadora: 'Transportadora', data_previsao: 'Previsão de entrega', data_entrega: 'Data da entrega', observacoes: 'Observações', cep: 'CEP', rua: 'Rua', numero: 'Número', complemento: 'Complemento', bairro: 'Bairro', cidade: 'Cidade', estado: 'UF' };
    const lista = Loja.el('dl', 'admin-gestao-detalhes');
    for (const [key, label] of Object.entries(campos)) if (registro[key] !== undefined) {
      const valor = registro[key];
      const dinheiro = ['preco', 'preco_promocional', 'preco_unitario', 'subtotal', 'valorSubtotal', 'valorDesconto', 'valorFrete', 'valorTotal'].includes(key);
      lista.append(Loja.el('dt', '', label), Loja.el('dd', '', valor == null || valor === '' ? 'Não informado' : typeof valor === 'boolean' ? valor ? 'Sim' : 'Não' : dinheiro ? Loja.moeda(valor) : String(valor)));
    }
    area.append(lista);
    if (registro.itensPedido) area.append(Loja.el('h4', '', 'Itens do pedido'), tabelaAdmin(['Código', 'Produto', 'Opção', 'Quantidade', 'Subtotal'], registro.itensPedido.map(item => [`#${item.codItemPedido}`, item.nome_produto || item.produtoItem?.nome || `Produto #${item.idProduto}`, `${item.tamanho || 'Não informado'} · ${item.cor || 'Não informado'}`, item.quantidade, Loja.moeda(item.subtotal)])));
    if (registro.entregaPedido) area.append(Loja.el('p', 'conta-muted', `Entrega #${registro.entregaPedido.codEntrega}: ${situacao(registro.entregaPedido.status)} · ${registro.entregaPedido.endereco_entrega}`));
    if (registro.pagamentoPedido) area.append(Loja.el('p', 'conta-muted', `Pagamento: ${situacao(registro.pagamentoPedido.status)} · ${registro.pagamentoPedido.provedor}`));
    el('gestaoDetalhes').hidden = false; el('gestaoDetalhes').scrollIntoView({ block: 'start' });
  }
  async function abrir() {
    if (estado.ocupado) return;
    estado.referencias = null;
    mensagemAdmin('');
    await executar(async () => { ajustarBusca(); await listar(); });
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isAdmin()) return;
    el('gestaoEntidade').onchange = () => {
      if (estado.ocupado) { el('gestaoEntidade').value = estado.entidade; return; }
      estado.entidade = el('gestaoEntidade').value; estado.registros = []; estado.sequencia++;
      fecharEditor(); el('gestaoDetalhes').hidden = true; el('gestaoTermo').value = ''; mensagem(); ajustarBusca();
      executar(listar);
    };
    el('gestaoCriterio').onchange = ajustarBusca;
    el('gestaoBuscaForm').onsubmit = event => { event.preventDefault(); executar(listar, event.submitter); };
    el('gestaoListar').onclick = () => { el('gestaoTermo').value = ''; executar(listar); };
    el('gestaoRecarregar').onclick = () => executar(listar);
    el('gestaoNovo').onclick = () => executar(() => editar());
    el('gestaoCancelar').onclick = () => { fecharEditor(); el('gestaoNovo').focus(); };
    el('gestaoFecharDetalhes').onclick = () => { el('gestaoDetalhes').hidden = true; el('gestaoTermo').focus(); };
    el('gestaoAdicionarItem').onclick = () => adicionarItem();
    el('gestaoForm').onsubmit = salvar;
    el('gestaoCalcular').onclick = event => executar(async () => { mostrarTotais(await Api.post('/pedidos/resumo', { itens: lerItens() }), 'Prévia do pedido'); }, event.currentTarget);
  });
  return { abrir };
})();
