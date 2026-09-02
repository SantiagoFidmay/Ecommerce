/**
 * Valida CPF matematicamente conforme fórmula oficial da Receita Federal
 */
const validarCPF = (cpf) => {
  // Remove formatação
  const cpfLimpo = cpf.replace(/[^\d]/g, '');

  if (cpfLimpo.length !== 11) return false;

  // Rejeita CPFs com todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;

  // Valida 1º dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo[9])) return false;

  // Valida 2º dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo[10])) return false;

  return true;
};

/**
 * Formata CPF para exibição: 000.000.000-00
 */
const formatarCPF = (cpf) => {
  const c = cpf.replace(/[^\d]/g, '');
  return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9, 11)}`;
};

module.exports = { validarCPF, formatarCPF };
