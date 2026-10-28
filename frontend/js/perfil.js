let perfilAtual = null;
const camposPerfil = ['nome', 'telefone', 'cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'estado'];

document.addEventListener('DOMContentLoaded', () => {
  if (!Conta.iniciar()) return;
  document.getElementById('perfilForm').onsubmit = salvarPerfil;
  document.getElementById('senhaForm').onsubmit = salvarSenha;
  document.getElementById('buscarCepPerfil').onclick = buscarCepPerfil;
  document.getElementById('tentarPerfil').onclick = carregarPerfil;
  for (const campo of ['novaSenha', 'confirmarSenha']) {
    document.getElementById(campo).oninput = () => document.getElementById('confirmarSenha').setCustomValidity('');
  }
  carregarPerfil();
});

function preencherPerfil(perfil) {
  perfilAtual = perfil;
  [...camposPerfil, 'email', 'cpf'].forEach(campo => { document.getElementById(campo).value = perfil[campo] || ''; });
  document.getElementById('contaNome').textContent = `Olá, ${String(perfil.nome).split(' ')[0]}.`;
  Auth.setToken(Auth.getToken(), { id: perfil.codUsuario, nome: perfil.nome, email: perfil.email, tipo: perfil.tipo_usuario });
  atualizarNavbar();
}

async function carregarPerfil() {
  document.getElementById('perfilCampos').disabled = true;
  document.getElementById('senhaCampos').disabled = true;
  document.getElementById('tentarPerfil').hidden = true;
  Conta.mensagem('perfilMessage', 'Carregando seus dados…');
  try {
    preencherPerfil(await Api.getPerfil());
    Conta.mensagem('perfilMessage', '');
    document.getElementById('perfilCampos').disabled = false;
    document.getElementById('senhaCampos').disabled = false;
  } catch (err) {
    Conta.erro(err, 'perfilMessage');
    document.getElementById('tentarPerfil').hidden = false;
  }
}

async function salvarPerfil(event) {
  event.preventDefault();
  if (!perfilAtual) return;
  const dados = Object.fromEntries(camposPerfil.map(campo => [campo, document.getElementById(campo).value.trim()]));
  const campos = document.getElementById('perfilCampos');
  campos.disabled = true;
  Conta.mensagem('perfilMessage', 'Salvando alterações…');
  try {
    const res = await Api.salvarMeuPerfil(dados);
    preencherPerfil(res.usuario);
    Conta.mensagem('perfilMessage', 'Seus dados foram salvos. O endereço será usado nas próximas compras.', 'success');
  } catch (err) { Conta.erro(err, 'perfilMessage'); }
  finally { campos.disabled = false; }
}

async function salvarSenha(event) {
  event.preventDefault();
  const senha = document.getElementById('novaSenha').value;
  const confirmacao = document.getElementById('confirmarSenha');
  if (senha !== confirmacao.value) {
    confirmacao.setCustomValidity('As senhas precisam ser iguais.');
    confirmacao.reportValidity();
    return;
  }
  const campos = document.getElementById('senhaCampos');
  const senha_atual = document.getElementById('senhaAtual').value;
  campos.disabled = true;
  Conta.mensagem('senhaMessage', 'Atualizando sua senha…');
  try {
    const resultado = await Api.salvarMeuPerfil({ senha, senha_atual });
    document.getElementById('senhaForm').reset();
    Conta.mensagem('senhaMessage', 'Senha alterada com sucesso.', 'success');
    if (resultado.reautenticar) {
      Auth.clearSession();
      setTimeout(() => Auth.requireAuth(), 1200);
    }
  } catch (err) { Conta.erro(err, 'senhaMessage'); }
  finally { campos.disabled = false; }
}

async function buscarCepPerfil() {
  const cep = document.getElementById('cep').value.replace(/\D/g, '');
  if (!/^\d{8}$/.test(cep)) { Conta.mensagem('cepMessage', 'Informe um CEP com oito dígitos.', 'error'); return; }
  const btn = document.getElementById('buscarCepPerfil');
  const salvar = document.getElementById('salvarPerfil');
  btn.disabled = true;
  salvar.disabled = true;
  Conta.mensagem('cepMessage', 'Buscando endereço…');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
    if (!resposta.ok) throw new Error();
    const dados = await resposta.json();
    // Não preenche um endereço antigo se o cliente alterou o CEP durante a consulta.
    if (document.getElementById('cep').value.replace(/\D/g, '') !== cep) {
      Conta.mensagem('cepMessage', 'O CEP mudou. Clique em Buscar CEP para consultar o novo endereço.');
      return;
    }
    if (dados.erro) { Conta.mensagem('cepMessage', 'CEP não encontrado. Confira ou preencha o endereço manualmente.', 'error'); return; }
    for (const [campo, origem] of [['rua', 'logradouro'], ['bairro', 'bairro'], ['cidade', 'localidade'], ['estado', 'uf']]) {
      document.getElementById(campo).value = dados[origem] || '';
    }
    Conta.mensagem('cepMessage', 'Endereço encontrado. Confira o número e o complemento.', 'success');
    document.getElementById('numero').focus();
  } catch {
    Conta.mensagem('cepMessage', 'Não foi possível consultar o CEP. Você pode preencher o endereço manualmente.', 'error');
  } finally {
    clearTimeout(timeout);
    btn.disabled = false;
    salvar.disabled = false;
  }
}
