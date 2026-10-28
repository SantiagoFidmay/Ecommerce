/**
 * cadastro.js — Cadastro com ViaCEP e validação de CPF
 */

/* ── Máscaras ── */
function mascaraCPF(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{0,3})/, '$1.$2');
  input.value = v;
}

function mascaraTelefone(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  else if (v.length > 6) v = v.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3');
  else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
  input.value = v;
}

function mascaraCEP(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 8);
  if (v.length > 5) v = v.replace(/(\d{5})(\d{0,3})/, '$1-$2');
  input.value = v;
}

function togglePassword(id, btn) {
  const input = document.getElementById(id);
  if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
  else { input.type = 'password'; btn.textContent = '👁'; }
}

/* ── Validação CPF ── */
function validarCPF(cpf) {
  const c = cpf.replace(/\D/g, '');
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(c[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(c[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(c[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(c[10]);
}

function validarCPFInput(input) {
  const indicator = document.getElementById('cpfIndicator');
  const cpf = input.value.replace(/\D/g, '');
  if (cpf.length < 11) {
    indicator.innerHTML = '';
    input.classList.remove('is-valid', 'is-invalid');
    return;
  }
  if (validarCPF(cpf)) {
    indicator.innerHTML = '<span class="vi-valid">✅ CPF válido</span>';
    input.classList.add('is-valid');
    input.classList.remove('is-invalid');
  } else {
    indicator.innerHTML = '<span class="vi-invalid">❌ CPF inválido</span>';
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
  }
}

/* ── Busca CEP (ViaCEP) ── */
let cepTimeout = null;
let cepController = null;
let cepConsulta = 0;

async function buscarCEP(cepRaw) {
  const cep = cepRaw.replace(/\D/g, '');
  const indicator = document.getElementById('cepIndicator');
  clearTimeout(cepTimeout);
  cepController?.abort();
  const consulta = ++cepConsulta;

  if (cep.length !== 8) {
    indicator.innerHTML = '';
    return;
  }

  cepTimeout = setTimeout(async () => {
    indicator.innerHTML = '<span class="vi-loading">🔍 Buscando endereço...</span>';
    const controller = new AbortController();
    cepController = controller;
    const timeout = setTimeout(() => controller.abort(), 8000);
    const campos = [['rua', 'logradouro'], ['bairro', 'bairro'], ['cidade', 'localidade'], ['estado', 'uf']];
    const anteriores = Object.fromEntries(campos.map(([campo]) => [campo, document.getElementById(campo).value]));

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
      if (!res.ok) throw new Error('Consulta indisponível');
      const data = await res.json();
      if (consulta !== cepConsulta) return;

      if (data.erro) {
        indicator.innerHTML = '<span class="vi-invalid">CEP não encontrado. Confira o CEP ou preencha o endereço manualmente.</span>';
        return;
      }

      // Preserva o que o cliente digitou enquanto a consulta estava em andamento.
      for (const [campo, origem] of campos) {
        const input = document.getElementById(campo);
        if (input.value === anteriores[campo]) input.value = data[origem] || '';
      }

      const incompleto = campos.some(([, origem]) => !data[origem]?.trim());
      indicator.innerHTML = incompleto
        ? '<span>CEP consultado. Complete os campos que faltam e confira o endereço.</span>'
        : '<span class="vi-valid">✅ Endereço encontrado! Confira os dados e informe o número.</span>';
    } catch {
      if (consulta === cepConsulta) indicator.innerHTML = '<span class="vi-invalid">Não foi possível consultar o CEP. Preencha o endereço manualmente.</span>';
    } finally {
      clearTimeout(timeout);
      if (cepController === controller) cepController = null;
    }
  }, 600);
}

/* ── Submit ── */
async function handleCadastro(e) {
  e.preventDefault();
  const errEl = document.getElementById('cadastroError');
  const btn = document.getElementById('btnCadastro');
  errEl.classList.add('hidden');

  const cpf = document.getElementById('cpf').value;
  if (!validarCPF(cpf.replace(/\D/g, ''))) {
    errEl.textContent = 'CPF inválido. Verifique os dígitos informados.';
    errEl.classList.remove('hidden');
    return;
  }

  const dados = {
    nome: document.getElementById('nome').value.trim(),
    email: document.getElementById('email').value.trim(),
    cpf: cpf.replace(/\D/g, ''),
    senha: document.getElementById('senha').value,
    telefone: document.getElementById('telefone').value,
    cep: document.getElementById('cep').value.replace(/\D/g, ''),
    rua: document.getElementById('rua').value,
    numero: document.getElementById('numero').value,
    complemento: document.getElementById('complemento').value,
    bairro: document.getElementById('bairro').value,
    cidade: document.getElementById('cidade').value,
    estado: document.getElementById('estado').value
  };

  if (!dados.nome || !dados.email || !dados.senha || !dados.cep) {
    errEl.textContent = 'Preencha todos os campos obrigatórios (*).';
    errEl.classList.remove('hidden');
    return;
  }

  for (const [campo, nome] of [['rua', 'a rua'], ['numero', 'o número'], ['bairro', 'o bairro'], ['cidade', 'a cidade'], ['estado', 'o estado']]) {
    dados[campo] = dados[campo].trim();
    if (!dados[campo]) {
      errEl.textContent = `Informe ${nome} do endereço. Se o CEP não preencher, digite manualmente.`;
      errEl.classList.remove('hidden');
      document.getElementById(campo).focus();
      return;
    }
  }
  dados.estado = dados.estado.toUpperCase();

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px"></div> Criando conta...';

  try {
    const res = await Api.cadastrar(dados);
    Auth.setToken(res.token, res.usuario);
    showToast('Conta criada com sucesso! Bem-vindo à Sport Kicks! 🎉', 'success');
    setTimeout(() => window.location.href = Auth.consumeRedirect(), 1500);
  } catch (err) {
    errEl.textContent = err.message || 'Erro ao criar conta.';
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Criar minha conta gratuita';
  }
}

window.mascaraCPF = mascaraCPF;
window.mascaraTelefone = mascaraTelefone;
window.mascaraCEP = mascaraCEP;
window.togglePassword = togglePassword;
window.validarCPFInput = validarCPFInput;
window.buscarCEP = buscarCEP;
window.handleCadastro = handleCadastro;
