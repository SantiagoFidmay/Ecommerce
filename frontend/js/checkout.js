/**
 * checkout.js — Lógica para a tela de checkout simulada
 */

document.addEventListener('DOMContentLoaded', () => {
  renderizarResumo();
});

function renderizarResumo() {
  const itens = Carrinho.getItens();
  const container = document.getElementById('checkoutItems');
  
  if (itens.length === 0) {
    window.location.href = 'catalogo.html'; // Se vazio, não tem o que comprar
    return;
  }

  // Renderiza itens
  container.innerHTML = itens.map(i => `
    <div class="checkout-item">
      <img src="${i.imagem_url || '../assets/images/placeholder.svg'}" class="checkout-item-img" alt="${i.nome}">
      <div class="checkout-item-info">
        <div class="checkout-item-name">${i.nome}</div>
        <div class="checkout-item-meta">Qtd: ${i.quantidade}</div>
      </div>
      <div class="checkout-item-price">R$ ${(i.preco * i.quantidade).toFixed(2).replace('.', ',')}</div>
    </div>
  `).join('');

  // Calcula Totais
  const subtotal = Carrinho.calcularSubtotal();
  const frete = Carrinho.calcularFrete(subtotal);
  const total = subtotal + frete;

  document.getElementById('chkSubtotal').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  document.getElementById('chkFrete').textContent = frete === 0 ? 'Grátis' : `R$ ${frete.toFixed(2).replace('.', ',')}`;
  document.getElementById('chkTotal').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function togglePaymentView() {
  const radios = document.getElementsByName('payment');
  let selected = 'credit';
  
  for (const radio of radios) {
    if (radio.checked) selected = radio.value;
  }

  const cardForm = document.getElementById('cardForm');
  const pixForm = document.getElementById('pixForm');

  if (selected === 'credit' || selected === 'debit') {
    cardForm.classList.remove('hidden');
    pixForm.classList.add('hidden');
  } else if (selected === 'pix') {
    cardForm.classList.add('hidden');
    pixForm.classList.remove('hidden');
  }
}

function processarPagamento() {
  const btn = document.getElementById('btnConfirmPayment');
  const btnText = document.getElementById('btnText');
  const loader = document.getElementById('btnLoader');

  // Muda para estado de loading
  btn.disabled = true;
  btnText.classList.add('hidden');
  loader.classList.remove('hidden');

  // Simula um delay de API de 2 segundos
  setTimeout(() => {
    // Retorna o botão ao normal
    btn.disabled = false;
    btnText.classList.remove('hidden');
    loader.classList.add('hidden');

    // Abre modal de sucesso
    document.getElementById('successModal').classList.remove('hidden');

    // Limpa o carrinho
    Carrinho.limpar();

  }, 2000);
}
