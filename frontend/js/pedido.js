document.addEventListener('DOMContentLoaded', () => {
  if (!Conta.iniciar()) return;
  document.getElementById('tentarPedido').onclick = carregarDetalhesPedido;
  carregarDetalhesPedido();
});

async function carregarDetalhesPedido() {
  const id = new URLSearchParams(window.location.search).get('id');
  const area = document.getElementById('pedidoDetalhe');
  area.replaceChildren();
  area.setAttribute('aria-busy', 'true');
  document.getElementById('tentarPedido').hidden = true;
  if (!/^[1-9]\d*$/.test(id || '') || Number(id) > 2147483647) {
    Conta.mensagem('pedidoMessage', 'Código de pedido inválido. Volte à lista e selecione uma compra.', 'error');
    area.setAttribute('aria-busy', 'false');
    return;
  }
  Conta.mensagem('pedidoMessage', 'Carregando os detalhes…');
  try {
    const pedido = await Api.getPedido(id);
    document.getElementById('contaNome').textContent = `Pedido #${pedido.codPedido}`;
    document.title = `Pedido #${pedido.codPedido} | Sport Kicks`;
    Conta.mensagem('pedidoMessage', '');
    renderizarDetalhesPedido(pedido, area);
  } catch (err) {
    Conta.erro(err, 'pedidoMessage');
    document.getElementById('tentarPedido').hidden = [400, 403, 404].includes(err.status);
  } finally { area.setAttribute('aria-busy', 'false'); }
}

function renderizarDetalhesPedido(pedido, area) {
  const cabecalho = Conta.elemento('section', 'conta-card conta-detail-heading');
  const topo = Conta.elemento('div', 'conta-order-heading');
  const infos = Conta.elemento('div');
  infos.append(Conta.elemento('h2', '', 'Acompanhe sua compra'), Conta.elemento('p', 'conta-muted', `Registrado em ${Conta.data(pedido.dataPedido)}`));
  topo.append(infos, Conta.badge(pedido.status));
  cabecalho.appendChild(topo);
  if (pedido.status === 'PENDENTE') cabecalho.appendChild(Conta.elemento('p', 'conta-muted', 'Seu pedido foi registrado e aguarda confirmação. O registro do pedido não representa aprovação do pagamento.'));
  if (pedido.status === 'CANCELADO') cabecalho.appendChild(Conta.elemento('p', 'conta-muted', 'Este pedido está cancelado.'));
  if (pedido.pagamentoPedido) cabecalho.appendChild(Conta.elemento('p', 'conta-muted', `Pagamento de demonstração: ${pedido.pagamentoPedido.status.toLowerCase()}. Nenhuma cobrança real.`));
  if (pedido.status === 'PENDENTE') {
    const acoes = Conta.elemento('div', 'loja-actions');
    if (pedido.pagamentoPedido?.provedor === 'demonstracao' && pedido.idUsuario === Auth.getUser()?.id) {
      const pagar = Conta.elemento('button', 'btn btn-primary', 'Simular confirmação de pagamento');
      pagar.onclick = async () => {
        if (!confirm('Esta é uma simulação. Nenhum valor será cobrado. Confirmar?')) return;
        pagar.disabled = true;
        try { await Api.post(`/pagamentos/${pedido.codPedido}/demonstrar`, { confirmarDemonstracao: true }); await carregarDetalhesPedido(); }
        catch (err) { Conta.erro(err, 'pedidoMessage'); pagar.disabled = false; }
      };
      acoes.appendChild(pagar);
    }
    const cancelar = Conta.elemento('button', 'btn btn-outline', 'Cancelar pedido');
    cancelar.onclick = async () => {
      if (!confirm('Cancelar o pedido e devolver as unidades ao estoque?')) return;
      cancelar.disabled = true;
      try { await Api.post(`/pedidos/${pedido.codPedido}/cancelar`, {}); await carregarDetalhesPedido(); }
      catch (err) { Conta.erro(err, 'pedidoMessage'); cancelar.disabled = false; }
    };
    acoes.appendChild(cancelar); cabecalho.appendChild(acoes);
    if (pedido.reservaPedido?.expira_em) cabecalho.appendChild(Conta.elemento('p', 'conta-muted mt-md', `Reserva até ${Conta.data(pedido.reservaPedido.expira_em)}. Pedidos sem confirmação podem ser cancelados após o prazo.`));
  }
  const grid = Conta.elemento('div', 'conta-detail-grid');
  const produtos = Conta.elemento('section', 'conta-card');
  produtos.appendChild(Conta.elemento('h2', '', 'Itens do pedido'));
  const lista = Conta.elemento('ul', 'conta-product-list');
  (pedido.itensPedido || []).forEach(item => {
    const produto = { ...item.produtoItem, nome: item.nome_produto || item.produtoItem?.nome || 'Produto indisponível', imagem_url: item.imagem_produto || item.produtoItem?.imagem_url };
    const linha = Conta.elemento('li', 'conta-product');
    const info = Conta.elemento('div', 'conta-product-info');
    info.append(Conta.elemento('h3', 'conta-product-name', produto.nome),
      Conta.elemento('p', 'conta-product-meta', [`Quantidade: ${item.quantidade}`, item.tamanho && `Tamanho: ${item.tamanho}`, item.cor && `Cor: ${item.cor}`].filter(Boolean).join(' · ')),
      Conta.elemento('p', 'conta-product-meta', `Valor unitário: ${Conta.moeda(item.preco_unitario)}`),
      Conta.elemento('strong', '', Conta.moeda(item.subtotal)));
    linha.append(Conta.imagem(produto), info);
    if (pedido.status === 'ENTREGUE' && pedido.idUsuario === Auth.getUser()?.id) {
      const detalhes = Conta.elemento('details', 'mt-md'); const summary = Conta.elemento('summary', '', 'Avaliar este produto'); detalhes.appendChild(summary);
      const form = Conta.elemento('form', 'loja-fieldset mt-md');
      const nota = Conta.elemento('select', 'form-control'); nota.setAttribute('aria-label', 'Nota de 1 a 5'); [5,4,3,2,1].forEach(n => { const opt = Conta.elemento('option', '', `${n} estrela(s)`); opt.value = n; nota.appendChild(opt); });
      const ajuste = Conta.elemento('select', 'form-control'); ajuste.setAttribute('aria-label', 'Ajuste do tênis'); for (const [valor, nome] of [['ADEQUADO','Forma adequada'],['PEQUENO','Forma pequena'],['GRANDE','Forma grande']]) { const opt = Conta.elemento('option', '', nome); opt.value = valor; ajuste.appendChild(opt); }
      const comentario = Conta.elemento('textarea', 'form-control'); comentario.required = true; comentario.maxLength = 1000; comentario.placeholder = 'Conte sua experiência'; comentario.setAttribute('aria-label', 'Seu comentário');
      const btn = Conta.elemento('button', 'btn btn-outline btn-sm', 'Publicar avaliação'); btn.type = 'submit';
      const mensagem = Conta.elemento('p', 'loja-subtitle'); mensagem.setAttribute('role', 'status');
      form.append(nota, ajuste, comentario, btn, mensagem); form.onsubmit = async event => { event.preventDefault(); btn.disabled = true; try { await Api.post(`/comunidade/produtos/${item.idProduto}/avaliacoes`, { idPedido: pedido.codPedido, nota: Number(nota.value), ajuste: ajuste.value, comentario: comentario.value }); mensagem.textContent = 'Obrigado! Sua avaliação foi publicada.'; } catch(err) { mensagem.textContent = err.message; btn.disabled = false; } }; detalhes.appendChild(form); info.appendChild(detalhes);
    }
    lista.appendChild(linha);
  });
  produtos.appendChild(lista);
  const resumo = Conta.elemento('section', 'conta-card');
  resumo.appendChild(Conta.elemento('h2', '', 'Resumo da compra'));
  const totais = Conta.elemento('dl', 'conta-totals');
  for (const [label, valor, classe] of [['Subtotal', pedido.valorSubtotal], ['Desconto', -Number(pedido.valorDesconto)], ['Frete', pedido.valorFrete], ['Total', pedido.valorTotal, 'conta-total']]) {
    const linha = Conta.elemento('div', classe);
    linha.append(Conta.elemento('dt', '', label), Conta.elemento('dd', '', Conta.moeda(valor)));
    totais.appendChild(linha);
  }
  const pagamentos = { PIX: 'PIX', CARTAO_CREDITO: 'Cartão de crédito', CARTAO_DEBITO: 'Cartão de débito', BOLETO: 'Boleto bancário' };
  resumo.append(totais, Conta.elemento('p', 'conta-muted', `Forma de pagamento escolhida: ${pagamentos[pedido.forma_pagamento] || 'Não informada'}`));
  grid.append(produtos, resumo);
  const entrega = Conta.elemento('section', 'conta-card');
  entrega.appendChild(Conta.elemento('h2', '', 'Entrega'));
  const dados = pedido.entregaPedido;
  if (!dados) entrega.appendChild(Conta.elemento('p', 'conta-muted', 'Os dados de entrega ainda não estão disponíveis.'));
  else {
    entrega.appendChild(Conta.badge(dados.status));
    const campos = Conta.elemento('dl', 'conta-delivery');
    const adicionar = (nome, texto) => campos.append(Conta.elemento('dt', '', nome), Conta.elemento('dd', '', texto));
    adicionar('Endereço desta compra', dados.endereco_entrega);
    adicionar('CEP', dados.cep_entrega || 'Não informado');
    adicionar('Transportadora', dados.transportadora || 'Ainda não informada');
    adicionar('Código de rastreio', dados.codigo_rastreio || 'Será informado quando disponível');
    adicionar('Previsão de entrega', dados.data_previsao ? Conta.data(dados.data_previsao, false) : 'Ainda não informada');
    if (dados.data_entrega) adicionar('Entrega registrada em', Conta.data(dados.data_entrega, false));
    entrega.appendChild(campos);
  }
  area.append(cabecalho, grid, entrega);
}
