/**
 * carrinho.js — Gerenciamento do carrinho via LocalStorage
 */

const Carrinho = {
  KEY: 'sk_cart',

  getItens() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },

  salvar(itens) {
    localStorage.setItem(this.KEY, JSON.stringify(itens));
    this.atualizarBadge();
  },

  adicionar(produto, quantidade = 1, tamanho = null, cor = null) {
    const itens = this.getItens();

    // Verificar estoque disponível
    if (produto.estoque && produto.estoque.quantidade === 0) {
      showToast('Produto sem estoque disponível!', 'error');
      return false;
    }

    const idx = itens.findIndex(i =>
      i.produto_id === produto.id &&
      i.tamanho === tamanho &&
      i.cor === cor
    );

    if (idx >= 0) {
      const qtdTotal = itens[idx].quantidade + quantidade;
      const estoqueDisp = produto.estoque?.quantidade || 999;
      if (qtdTotal > estoqueDisp) {
        showToast(`Estoque insuficiente. Disponível: ${estoqueDisp}`, 'warning');
        return false;
      }
      itens[idx].quantidade += quantidade;
    } else {
      itens.push({
        produto_id: produto.id,
        nome: produto.nome,
        marca: produto.marca || '',
        preco: parseFloat(produto.preco_promocional || produto.preco),
        preco_original: parseFloat(produto.preco),
        imagem_url: produto.imagem_url || '',
        quantidade,
        tamanho,
        cor,
        estoque_max: produto.estoque?.quantidade || 999
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
      produto_id: i.produto_id,
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
  window.location.href = 'checkout.html';
}
window.finalizarCompra = finalizarCompra;
