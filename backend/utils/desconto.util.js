/**
 * Calcula desconto automático baseado no subtotal do carrinho
 * Regras de negócio de desconto para artigos esportivos
 */
const calcularDesconto = (subtotal, quantidadeItens = 1) => {
  let percentual = 0;
  let motivo = '';

  if (subtotal >= 1500) {
    percentual = 15;
    motivo = '15% de desconto em compras a partir de R$ 1.500';
  } else if (subtotal >= 800) {
    percentual = 10;
    motivo = '10% de desconto em compras a partir de R$ 800';
  } else if (subtotal >= 400) {
    percentual = 5;
    motivo = '5% de desconto em compras a partir de R$ 400';
  } else if (quantidadeItens >= 3) {
    percentual = 5;
    motivo = '5% de desconto na compra de 3 ou mais itens';
  }

  const valorDesconto = parseFloat(((subtotal * percentual) / 100).toFixed(2));

  return {
    percentual,
    valor: valorDesconto,
    motivo,
    totalComDesconto: parseFloat((subtotal - valorDesconto).toFixed(2))
  };
};

/**
 * Calcula frete baseado no total e CEP
 */
const calcularFrete = (total) => {
  if (total >= 500) return 0; // Frete grátis a partir de R$ 500
  if (total >= 200) return 15.90;
  return 25.90;
};

module.exports = { calcularDesconto, calcularFrete };
