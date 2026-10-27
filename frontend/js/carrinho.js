/**
 * carrinho.js — Gerenciamento do carrinho via LocalStorage
 */

const Carrinho = {
  KEY: 'sk_cart',

  getItens() {
    try {
      const itens = JSON.parse(localStorage.getItem(this.KEY));
      return Array.isArray(itens) ? itens : [];
    }
    catch { return []; }
  },

  salvar(itens) {
    localStorage.setItem(this.KEY, JSON.stringify(itens));
    this.atualizarBadge();
  },

  adicionar(produto, quantidade = 1, tamanho = null, cor = null) {
    const itens = this.getItens();
    const id = Number(produto.id ?? produto.codProduto);
    const estoque = produto.estoque ?? produto.estoqueProduto;
    const disponivel = Number(estoque?.quantidade ?? 0);
    if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(quantidade) || quantidade < 1) return false;
    const noCarrinho = itens.filter(i => i.produto_id === id).reduce((soma, i) => soma + i.quantidade, 0);
    if (noCarrinho + quantidade > disponivel) {
      showToast(`Estoque insuficiente. Disponível: ${disponivel}`, 'warning');
      return false;
    }

    // Verificar estoque disponível
    if (produto.estoque && produto.estoque.quantidade === 0) {
      showToast('Produto sem estoque disponível!', 'error');
      return false;
    }

    const idx = itens.findIndex(i =>
      i.produto_id === id &&
      i.tamanho === tamanho &&
      i.cor === cor
    );

    if (idx >= 0) {
      const qtdTotal = itens[idx].quantidade + quantidade;
      const estoqueDisp = disponivel;
      if (qtdTotal > estoqueDisp) {
        showToast(`Estoque insuficiente. Disponível: ${estoqueDisp}`, 'warning');
        return false;
      }
      itens[idx].quantidade += quantidade;
    } else {
      itens.push({
        produto_id: id,
        nome: produto.nome,
        marca: produto.marca || '',
        preco: parseFloat(produto.preco_promocional || produto.preco),
        preco_original: parseFloat(produto.preco),
        imagem_url: produto.imagem_url || '',
        quantidade,
        tamanho,
        cor,
        estoque_max: disponivel
      });
    }

    this.salvar(itens);
    showToast(`${produto.nome} adicionado ao carrinho! 🛒`, 'success');
    return true;
  },

  remover(produto_id, tamanho = null, cor = null) {
    const itens = this.getItens().filter(i =>
      !(i.produto_id === produto_id && i.tamanho === tamanho && i.cor === cor)
    );
    this.salvar(itens);
  },

  atualizarQuantidade(produto_id, quantidade, tamanho = null, cor = null) {
    if (!Number.isSafeInteger(quantidade)) return;
    const itens = this.getItens();
    const idx = itens.findIndex(i =>
      i.produto_id === produto_id && i.tamanho === tamanho && i.cor === cor
    );
    if (idx >= 0) {
      if (quantidade <= 0) {
        itens.splice(idx, 1);
      } else if (quantidade > itens[idx].estoque_max) {
        showToast(`Estoque máximo: ${itens[idx].estoque_max}`, 'warning');
        return;
      } else {
        itens[idx].quantidade = quantidade;
      }
      this.salvar(itens);
    }
  },

  limpar() {
    localStorage.removeItem(this.KEY);
    this.atualizarBadge();
  },

  totalItens() {
    return this.getItens().reduce((sum, i) => sum + i.quantidade, 0);
  },

  calcularSubtotal() {
    return this.getItens().reduce((sum, i) => sum + (i.preco * i.quantidade), 0);
  },

  calcularDesconto(subtotal, qtdItens) {
    let percentual = 0;
    let motivo = '';
    if (subtotal >= 1500)     { percentual = 15; motivo = '15% de desconto (acima de R$ 1.500)'; }
    else if (subtotal >= 800) { percentual = 10; motivo = '10% de desconto (acima de R$ 800)'; }
    else if (subtotal >= 400) { percentual = 5;  motivo = '5% de desconto (acima de R$ 400)'; }
    else if (qtdItens >= 3)   { percentual = 5;  motivo = '5% de desconto (3+ itens)'; }
    const valor = parseFloat(((subtotal * percentual) / 100).toFixed(2));
    return { percentual, valor, motivo, totalComDesconto: subtotal - valor };
  },

  calcularFrete(subtotal) {
    if (subtotal >= 500) return 0;
    if (subtotal >= 200) return 15.90;
    return 25.90;
  },

  atualizarBadge() {
    const total = this.totalItens();
    const badge = document.getElementById('cartBadge');
    const count = document.getElementById('cartCount');
    if (count) count.textContent = total;
    if (badge) {
      badge.textContent = total;
      badge.style.display = total > 0 ? 'flex' : 'none';
    }
  },

  toApiPayload() {
    return this.getItens().map(i => ({
      idProduto: Number(i.produto_id),
      quantidade: i.quantidade,
      tamanho: i.tamanho,
      cor: i.cor
    }));
  }
};

document.addEventListener('DOMContentLoaded', () => Carrinho.atualizarBadge());
window.Carrinho = Carrinho;

function finalizarCompra() {
  if (Carrinho.getItens().length === 0) {
    if (typeof showToast !== 'undefined') showToast('Seu carrinho está vazio!', 'warning');
    return;
  }
  const pagamento = document.getElementById('formaPagamento');
  if (pagamento) sessionStorage.setItem('sk_pagamento', pagamento.value);
  window.location.href = 'checkout.html';
}
window.finalizarCompra = finalizarCompra;

function renderizarCarrinhoNaPagina() {
  const container = document.getElementById('cartItemsContainer');
  if (!container) return;
  container.replaceChildren();
  const itens = Carrinho.getItens();
  document.getElementById('cartSummary').hidden = !itens.length;
  if (!itens.length) {
    const vazio = document.createElement('div');
    vazio.className = 'empty-cart';
    vazio.innerHTML = '<p>Seu carrinho está vazio.</p><a href="catalogo.html" class="btn btn-primary">Ver produtos</a>';
    container.appendChild(vazio);
    return;
  }
  itens.forEach(item => {
    const linha = document.createElement('article');
    linha.className = 'cart-item';
    const imagem = document.createElement('img');
    imagem.className = 'cart-item-img';
    imagem.src = item.imagem_url || '../assets/images/placeholder.svg';
    imagem.alt = item.nome;
    const detalhes = document.createElement('div');
    detalhes.className = 'cart-item-details';
    const nome = document.createElement('h2');
    nome.className = 'cart-item-name';
    nome.textContent = item.nome;
    const preco = document.createElement('p');
    preco.textContent = (item.preco * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const quantidade = document.createElement('input');
    quantidade.type = 'number';
    quantidade.min = '1';
    quantidade.max = item.estoque_max;
    quantidade.value = item.quantidade;
    quantidade.className = 'cart-quantity-input';
    quantidade.setAttribute('aria-label', `Quantidade de ${item.nome}`);
    quantidade.onchange = () => {
      Carrinho.atualizarQuantidade(item.produto_id, Number(quantidade.value), item.tamanho, item.cor);
      renderizarCarrinhoNaPagina();
    };
    const remover = document.createElement('button');
    remover.type = 'button';
    remover.className = 'btn btn-ghost btn-sm';
    remover.textContent = 'Remover';
    remover.setAttribute('aria-label', `Remover ${item.nome}`);
    remover.onclick = () => {
      Carrinho.remover(item.produto_id, item.tamanho, item.cor);
      renderizarCarrinhoNaPagina();
    };
    detalhes.append(nome, preco, quantidade, remover);
    linha.append(imagem, detalhes);
    container.appendChild(linha);
  });
  const moeda = valor => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const subtotal = Carrinho.calcularSubtotal();
  const desconto = Carrinho.calcularDesconto(subtotal, Carrinho.totalItens());
  const frete = Carrinho.calcularFrete(subtotal);
  document.getElementById('summarySubtotal').textContent = moeda(subtotal);
  document.getElementById('summaryFreight').textContent = frete === 0 ? 'Grátis' : moeda(frete);
  document.getElementById('summaryDiscountRow').style.display = desconto.valor ? '' : 'none';
  document.querySelector('#summaryDiscountRow span').textContent = desconto.motivo;
  document.getElementById('summaryDiscount').textContent = `− ${moeda(desconto.valor)}`;
  document.getElementById('summaryTotal').textContent = moeda(desconto.totalComDesconto + frete);
}
