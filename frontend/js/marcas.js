document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await Api.get('/comunidade/marcas');
    const area = document.getElementById('marcasLista');
    res.marcas.forEach(marca => {
      const card = Loja.el('article', 'loja-card loja-brand'); card.id = marca.slug;
      card.append(Loja.el('span', 'conta-eyebrow', 'MARCA DO CATÁLOGO'), Loja.el('h2', '', marca.nome), Loja.el('p', '', marca.descricao));
      const links = Loja.el('div', 'loja-actions'); const catalogo = Loja.el('a', 'btn btn-primary btn-sm', 'Ver modelos'); catalogo.href = `catalogo.html?marca=${encodeURIComponent(marca.nome)}`; links.appendChild(catalogo);
      for (const [url, label] of [[marca.site_url, 'Site oficial ↗'], [marca.contato_url, 'Atendimento oficial ↗']]) {
        const link = Loja.el('a', 'btn btn-outline btn-sm', label); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; links.appendChild(link);
      }
      card.appendChild(links); area.appendChild(card);
    });
  } catch (err) { const el = document.getElementById('marcasMessage'); el.hidden = false; el.textContent = err.message; }
});
