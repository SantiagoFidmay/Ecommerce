let paginaPedidos = 1;
let requisicaoPedidos = 0;

document.addEventListener('DOMContentLoaded', () => {
  if (!Conta.iniciar()) return;
  document.getElementById('filtroStatus').onchange = () => carregarMeusPedidos(1);
  document.getElementById('tentarPedidos').onclick = () => carregarMeusPedidos(paginaPedidos);
  carregarMeusPedidos();
});

async function carregarMeusPedidos(pagina = 1) {
  const requisicao = ++requisicaoPedidos;
  paginaPedidos = pagina;
  const lista = document.getElementById('pedidosLista');
  const paginacao = document.getElementById('pedidosPaginacao');
  lista.setAttribute('aria-busy', 'true');
  lista.replaceChildren();
  paginacao.replaceChildren();
  document.getElementById('pedidosCount').textContent = 'Carregando pedidos…';
  document.getElementById('tentarPedidos').hidden = true;
  Conta.mensagem('pedidosMessage', '');
  const status = document.getElementById('filtroStatus').value;
  try {
    const res = await Api.getMeusPedidos({ pagina, limite: 6, ...(status ? { status } : {}) });
    if (requisicao !== requisicaoPedidos) return;
    document.getElementById('pedidosCount').textContent = `${res.total} pedido${res.total === 1 ? '' : 's'} encontrado${res.total === 1 ? '' : 's'}`;
    if (!res.pedidos.length) {
      const vazio = Conta.elemento('section', 'conta-card conta-empty');
      vazio.append(Conta.elemento('h2', '', status ? 'Nenhum pedido com esse status' : 'Sua próxima corrida começa aqui'),
        Conta.elemento('p', '', status ? 'Selecione outro status para consultar suas compras.' : 'Você ainda não fez nenhum pedido. Explore os modelos e encontre seu próximo par.'));
      const link = Conta.elemento('a', 'btn btn-primary', 'Explorar catálogo');
      link.href = 'catalogo.html';
      vazio.appendChild(link);
      lista.appendChild(vazio);
    } else {
      res.pedidos.forEach(pedido => lista.appendChild(cartaoPedido(pedido)));
    }
    if (res.totalPaginas > 1) {
      const anterior = Conta.elemento('button', 'btn btn-outline btn-sm', 'Anterior');
      anterior.type = 'button';
      anterior.disabled = pagina <= 1;
      anterior.onclick = () => carregarMeusPedidos(pagina - 1);
      const proximo = Conta.elemento('button', 'btn btn-outline btn-sm', 'Próxima');
      proximo.type = 'button';
      proximo.disabled = pagina >= res.totalPaginas;
      proximo.onclick = () => carregarMeusPedidos(pagina + 1);
      paginacao.append(anterior, Conta.elemento('span', 'conta-muted', `Página ${pagina} de ${res.totalPaginas}`), proximo);
    }
  } catch (err) {
    if (requisicao !== requisicaoPedidos) return;
    document.getElementById('pedidosCount').textContent = 'Pedidos indisponíveis no momento';
    document.getElementById('tentarPedidos').hidden = false;
    Conta.erro(err, 'pedidosMessage');
  } finally {
    if (requisicao === requisicaoPedidos) lista.setAttribute('aria-busy', 'false');
  }
}

function cartaoPedido(pedido) {
  const card = Conta.elemento('article', 'conta-card conta-order');
  const header = Conta.elemento('div', 'conta-order-heading');
  const titulo = Conta.elemento('div');
  titulo.append(Conta.elemento('h2', '', `Pedido #${pedido.codPedido}`), Conta.elemento('p', 'conta-muted', Conta.data(pedido.dataPedido)));
  header.append(titulo, Conta.badge(pedido.status));
  const itens = pedido.itensPedido || [];
  const lista = Conta.elemento('ul', 'conta-order-items');
  itens.slice(0, 2).forEach(item => lista.appendChild(Conta.elemento('li', '', `${item.quantidade}× ${item.nome_produto || item.produtoItem?.nome || 'Produto indisponível'}`)));
  if (itens.length > 2) lista.appendChild(Conta.elemento('li', '', `+ ${itens.length - 2} outro(s) item(ns)`));
  const footer = Conta.elemento('div', 'conta-order-footer');
  const total = Conta.elemento('div');
  total.append(Conta.elemento('div', 'conta-muted', 'Total do pedido'), Conta.elemento('div', 'conta-order-total', Conta.moeda(pedido.valorTotal)));
  const link = Conta.elemento('a', 'btn btn-outline btn-sm', 'Ver detalhes');
  link.href = `pedido.html?id=${encodeURIComponent(pedido.codPedido)}`;
  link.setAttribute('aria-label', `Ver detalhes do pedido ${pedido.codPedido}`);
  footer.append(total, link);
  card.append(header, lista, footer);
  return card;
}
