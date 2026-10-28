document.addEventListener('DOMContentLoaded', () => {
  const token = location.hash.slice(1); const redefinir = /^[a-f0-9]{64}$/.test(token);
  if (location.hash) history.replaceState(null, '', location.pathname);
  document.getElementById('senhaGrupo').hidden = !redefinir; document.getElementById('emailGrupo').hidden = redefinir;
  document.getElementById('email').required = !redefinir; document.getElementById('novaSenha').required = redefinir; document.getElementById('confirmarSenha').required = redefinir;
  const btn = document.getElementById('recuperarBtn'); btn.textContent = redefinir ? 'Redefinir senha' : 'Enviar instruções';
  document.getElementById('recuperarForm').onsubmit = async event => {
    event.preventDefault(); const message = document.getElementById('recuperarMessage'); message.hidden = false;
    if (redefinir && document.getElementById('novaSenha').value !== document.getElementById('confirmarSenha').value) { message.textContent = 'As senhas precisam ser iguais.'; return; }
    btn.disabled = true;
    try {
      const dados = redefinir ? { token, senha: document.getElementById('novaSenha').value } : { email: document.getElementById('email').value };
      const res = await Api.post(`/auth/${redefinir ? 'redefinir' : 'recuperar'}`, dados); message.textContent = res.mensagem;
      if (redefinir) { Auth.clearSession(); document.getElementById('recuperarForm').reset(); btn.hidden = true; }
    } catch (err) { message.textContent = err.message; }
    finally { btn.disabled = false; }
  };
});
