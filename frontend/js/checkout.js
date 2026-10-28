/** Checkout integrado ao pedido e ao estoque. Cobrança será integrada em outra etapa. */
let resumoCheckout = null;
let carrinhoConferido = '';
let enviandoPedido = false;
let pedidoConcluido = false;
const moedaCheckout = valor => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const camposEndereco = ['cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'estado'];

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth('login.html')) return;
  if (!Carrinho.getItens().length) { window.location.href = 'catalogo.html'; return; }
  const pagamentos = { CARTAO_CREDITO: 'credit', CARTAO_DEBITO: 'debit', PIX: 'pix', BOLETO: 'boleto' };
  document.querySelector(`input[name="payment"][value="${pagamentos[sessionStorage.getItem('sk_pagamento')] || 'credit'}"]`).checked = true;
  togglePaymentView();
  try {
    const perfil = await Api.getPerfil();
    camposEndereco.forEach(campo => { document.getElementById(campo).value = perfil[campo] || ''; });
  } catch (err) {
    if (err.status === 401) { redirecionarLoginCheckout(); return; }
    mostrarErroCheckout('Não foi possível carregar seu endereço. Preencha os campos para continuar.');
  }
  await carregarResumoCheckout();
});

function mostrarErroCheckout(mensagem) {
  const erro = document.getElementById('checkoutError');
  erro.textContent = mensagem;
  erro.hidden = !mensagem;
}

async function carregarResumoCheckout() {
  const btn = document.getElementById('btnConfirmPayment');
  btn.disabled = true;
  resumoCheckout = null;
  const itens = Carrinho.toApiPayload();
  if (!itens.length) { window.location.href = 'carrinho.html'; return; }
  try {
    const resumo = await Api.resumirPedido(itens);
    carrinhoConferido = JSON.stringify(itens);
    resumoCheckout = resumo;
    renderizarResumo(resumo);
    document.getElementById('btnText').textContent = 'Confirmar pedido';
  } catch (err) {
    mostrarErroCheckout(err.message || 'Não foi possível conferir os produtos. Tente novamente.');
    document.getElementById('btnText').textContent = 'Conferir carrinho novamente';
    if (err.status === 401) redirecionarLoginCheckout();
  } finally { btn.disabled = false; }
}

function renderizarResumo(resumo) {
  const container = document.getElementById('checkoutItems');
  container.replaceChildren();
  resumo.itens.forEach(item => {
    const linha = document.createElement('div');
    linha.className = 'checkout-item';
    const imagem = document.createElement('img');
    imagem.className = 'checkout-item-img';
    imagem.src = item.imagem_url || '../assets/images/placeholder.svg';
    imagem.alt = item.nome;
    const info = document.createElement('div');
    info.className = 'checkout-item-info';
    const nome = document.createElement('div');
    nome.className = 'checkout-item-name';
    nome.textContent = item.nome;
    const meta = document.createElement('div');
    meta.className = 'checkout-item-meta';
    meta.textContent = [`Qtd: ${item.quantidade}`, item.tamanho && `Tamanho: ${item.tamanho}`, item.cor].filter(Boolean).join(' · ');
    const preco = document.createElement('div');
    preco.className = 'checkout-item-price';
    preco.textContent = moedaCheckout(item.subtotal);
    info.append(nome, meta);
    linha.append(imagem, info, preco);
    container.appendChild(linha);
  });
  document.getElementById('chkSubtotal').textContent = moedaCheckout(resumo.valorSubtotal);
  document.getElementById('chkDiscount').textContent = `− ${moedaCheckout(resumo.valorDesconto)}`;
  document.getElementById('chkDiscountLabel').textContent = resumo.motivo_desconto || 'Desconto';
  document.getElementById('chkFrete').textContent = resumo.valorFrete === 0 ? 'Grátis' : moedaCheckout(resumo.valorFrete);
  document.getElementById('chkTotal').textContent = moedaCheckout(resumo.valorTotal);
}

function redirecionarLoginCheckout() {
  Auth.clearSession();
  Auth.requireAuth();
}

function togglePaymentView() {
  const pix = document.querySelector('input[name="payment"]:checked')?.value === 'pix';
  document.getElementById('paymentNotice').textContent = pix
    ? 'PIX selecionado. Seu pedido ficará pendente; ainda não há código PIX ou cobrança nesta versão.'
    : 'A forma de pagamento será registrada no pedido. Nenhum valor será cobrado nesta versão.';
}

async function processarPagamento() {
  if (enviandoPedido || pedidoConcluido) return;
  if (!Auth.isLoggedIn()) { redirecionarLoginCheckout(); return; }
  if (!resumoCheckout) { await carregarResumoCheckout(); return; }
  mostrarErroCheckout('');
  const itens = Carrinho.toApiPayload();
  if (JSON.stringify(itens) !== carrinhoConferido) {
    await carregarResumoCheckout();
    mostrarErroCheckout('O carrinho mudou. Confira os valores antes de confirmar novamente.');
    return;
  }
  if (!document.getElementById('enderecoForm').reportValidity()) return;
  const pagamentos = { credit: 'CARTAO_CREDITO', debit: 'CARTAO_DEBITO', pix: 'PIX', boleto: 'BOLETO' };
  const endereco_entrega = Object.fromEntries(camposEndereco.map(campo => [campo, document.getElementById(campo).value.trim()]));
  const btn = document.getElementById('btnConfirmPayment');
  enviandoPedido = true;
  btn.disabled = true;
  document.getElementById('btnText').textContent = 'Registrando pedido…';
  document.getElementById('btnLoader').classList.remove('hidden');
  try {
    const impressao = JSON.stringify({ itens, endereco_entrega, pagamento: document.querySelector('input[name="payment"]:checked').value });
    let tentativa;
    try { tentativa = JSON.parse(sessionStorage.getItem('sk_checkout_attempt')); } catch { tentativa = null; }
    if (!tentativa || tentativa.impressao !== impressao) {
      tentativa = { impressao, chave: crypto.randomUUID() };
      sessionStorage.setItem('sk_checkout_attempt', JSON.stringify(tentativa));
    }
    const res = await Api.criarPedido({ itens, endereco_entrega,
      chaveCheckout: tentativa.chave,
      forma_pagamento: pagamentos[document.querySelector('input[name="payment"]:checked').value],
      valorTotalEsperado: resumoCheckout.valorTotal });
    if (!res.pedido?.id) throw new Error('A resposta do pedido não pôde ser confirmada.');
    pedidoConcluido = true;
    sessionStorage.removeItem('sk_checkout_attempt');
    // Preserva alterações feitas em outra aba durante o envio.
    if (JSON.stringify(Carrinho.toApiPayload()) === carrinhoConferido) Carrinho.limpar();
    document.getElementById('successMessage').textContent = `Pedido #${res.pedido.id} registrado. Total: ${moedaCheckout(res.pedido.valorTotal)}. Pagamento pendente; nenhum valor foi cobrado.`;
    document.getElementById('successModal').classList.remove('hidden');
    document.getElementById('successOrder').href = `pedido.html?id=${encodeURIComponent(res.pedido.id)}`;
    document.getElementById('successOrder').focus();
  } catch (err) {
    if (err.status === 401) redirecionarLoginCheckout();
    if (err.status === 409) await carregarResumoCheckout();
    mostrarErroCheckout(err.message || 'Não foi possível confirmar o pedido. Seu carrinho foi mantido.');
  } finally {
    enviandoPedido = false;
    btn.disabled = pedidoConcluido;
    document.getElementById('btnText').textContent = pedidoConcluido ? 'Pedido registrado' : resumoCheckout ? 'Confirmar pedido' : 'Conferir carrinho novamente';
    document.getElementById('btnLoader').classList.add('hidden');
  }
}
