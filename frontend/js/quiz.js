document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('quizForm').onsubmit = async event => {
    event.preventDefault();
    const btn = event.submitter; btn.disabled = true;
    const area = document.getElementById('quizResultados'); area.replaceChildren();
    const mensagem = document.getElementById('quizMessage'); mensagem.hidden = false; mensagem.textContent = 'Buscando opções…';
    try {
      const params = new URLSearchParams({ orcamento: document.getElementById('orcamento').value, uso: document.getElementById('uso').value });
      const res = await Api.get(`/comunidade/recomendar?${params}`);
      mensagem.textContent = res.resultados.length ? res.criterio : 'Nenhum modelo disponível dentro desses critérios. Experimente outro orçamento ou finalidade.';
      res.resultados.forEach(r => { const card = Loja.card(r.produto); const motivos = Loja.el('ul', 'conta-order-items'); r.motivos.forEach(m => motivos.appendChild(Loja.el('li', '', m))); card.appendChild(motivos); area.appendChild(card); });
    } catch (err) { mensagem.textContent = err.message; }
    finally { btn.disabled = false; }
  };
});
