/**
 * produto.js — Lógica da página de detalhes do produto
 */

let produtoAtual = null;

// Reviews na ordem do catálogo enviada pelo usuário; vínculo pelo modelo, não pelo ID do banco.
const reviewsProdutos = [
  { modelo: /\bboston\s+13\b/i, video: 'lqaQtL1nIKk' },
  { modelo: /\badios\s+pro\s+4\b/i, video: 'OCM0M5g5EhM' },
  { modelo: /\badios\s+pro\s+5\b/i, video: 'Ln1I5DnLjYQ' },
  { modelo: /\bevo\s+sl\b/i, video: 'N5v4dPdu4eg' },
  { modelo: /\bhyperboost\s+edge\b/i, video: 'Qy77m-jREac' },
  { modelo: /\bsuperblast\b/i, video: 'wQwx0trSlSo' },
  { modelo: /\bnovablast\b/i, video: '2HMzsrF0Fd0' },
  { modelo: /\bmetaspeed\b/i, video: 'z2aOh3Pg9tY' },
  { modelo: /\bmegablast\b/i, video: 'RFJmUJNpnUI' },
  { modelo: /\brebel\s+v5\b/i, video: '0xI2a9wnJ6Y' },
  { modelo: /\b1080\s+v15\b/i, video: '0HzV3AaR9tQ' },
  { modelo: /\bsupercomp\b/i, video: 'hBCscswo7MQ' },
  { modelo: /\bvaporfly\b/i, video: '1bj2D7ydDNI' },
  { modelo: /\balphafly\b/i, video: 'ELCjA_7mg5o' },
  { modelo: /\bvomero\b/i, video: 'FPmrV1HRTKg' },
  { modelo: /\bcorre\s+5\b/i, video: 'lfTjOBqDP4Q' },
  { modelo: /\bturbo\b/i, video: 'PBXjne7Lxpw' },
  { modelo: /\bsupra\b/i, video: 'b2TTwMEoEQ8' }
];

function renderizarReview(p) {
  const section = document.getElementById('pdpReview');
  const player = document.getElementById('pdpReviewPlayer');
  const review = reviewsProdutos.find(item => item.modelo.test(p.nome || ''));
  player.replaceChildren();
  section.hidden = !review;
  if (!review) return;

  document.getElementById('pdpReviewSubtitle').textContent = `Conheça o ${p.nome} em detalhes.`;
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube.com/embed/${review.video}`;
  iframe.title = `Review do ${p.nome}`;
  iframe.loading = 'lazy';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.allowFullscreen = true;
  player.appendChild(iframe);
  document.getElementById('pdpReviewLink').href = `https://www.youtube.com/watch?v=${review.video}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    window.location.href = 'catalogo.html';
    return;
  }

  await carregarProduto(id);
});

async function carregarProduto(id) {
  try {
    const res = await Api.getProduto(id);
    if (!res || res.error) throw new Error('Produto não encontrado na API');
    
    produtoAtual = { ...res, id: res.codProduto, estoque: res.estoqueProduto, categoria: res.categoriaProduto };
    renderizarProduto(produtoAtual);
  } catch (err) {
    console.warn('API falhou ou produto inexistente, carregando mock data...', err);
    
    // Fallback: mock data array for id 1 to 4
    const produtosDemo = [
        { id: 1, codProduto: 1, nome: 'Adizero Boston 13',  marca: 'Adidas', preco: '1099.90', preco_promocional: '899.90',  categoria: { nome: 'Corrida', icone: '🏃' }, imagem_url: '../../imagens/boston13-1.webp', estoque: { quantidade: 5  }, descricao: 'O Adizero Boston 13 foi projetado para corredores de alta performance. Apresenta amortecimento Lightstrike Pro e uma malha superior extremamente respirável para máximo conforto.' },
        { id: 2, codProduto: 2, nome: 'Adizero Adios Pro 4', marca: 'Adidas', preco: '1599.90', preco_promocional: null,     categoria: { nome: 'Corrida', icone: '🏃' }, imagem_url: '../../imagens/adiospro1.avif', estoque: { quantidade: 10 }, descricao: 'Projetado para quebrar recordes, o Adios Pro 4 vem equipado com hastes de carbono ENERGYRODS para transições rápidas e explosivas.' },
        { id: 3, codProduto: 3, nome: 'Hyperboost Edge',    marca: 'Adidas', preco: '799.90',  preco_promocional: '699.90',  categoria: { nome: 'Treino', icone: '💪' }, imagem_url: '../../imagens/hyperboostEdge1.avif', estoque: { quantidade: 2  }, descricao: 'O tênis ideal para treinos diários e academias. O cabedal adaptável e o solado com grande aderência garantem estabilidade.' },
        { id: 4, codProduto: 4, nome: 'Adizero EVO SL',     marca: 'Adidas', preco: '1099.00',  preco_promocional: null,     categoria: { nome: 'Corrida', icone: '🏃' }, imagem_url: '../../imagens/evosl1.avif', estoque: { quantidade: 8  }, descricao: 'Leveza e resposta rápida. O Adizero EVO SL combina materiais sustentáveis com o máximo de performance para a sua corrida.' }
    ];

    const produtoMock = produtosDemo.find(p => p.id == id);

    if (produtoMock) {
      produtoAtual = produtoMock;
      renderizarProduto(produtoAtual);
    } else {
      document.querySelector('.pdp-container').innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding: 4rem;">
          <h2>Produto não encontrado</h2>
          <a href="catalogo.html" class="btn btn-outline" style="margin-top:1rem">Voltar ao Catálogo</a>
        </div>
      `;
    }
  }
}

function renderizarProduto(p) {
  renderizarReview(p);
  // Preencher Breadcrumb e Títulos
  document.getElementById('breadcrumbProduto').textContent = p.nome;
  document.getElementById('pdpTitle').textContent = p.nome;
  document.getElementById('pdpBrand').textContent = p.marca || (p.categoria && p.categoria.nome) || 'Marca';
  
  // Preço e Promoção
  const preco = parseFloat(p.preco);
  const precoPromo = p.preco_promocional ? parseFloat(p.preco_promocional) : null;
  const temPromo = precoPromo && precoPromo < preco;

  const precoFinal = temPromo ? precoPromo : preco;
  
  if (temPromo) {
    document.getElementById('pdpOldPrice').style.display = 'block';
    document.getElementById('pdpOldPrice').textContent = `R$ ${preco.toFixed(2).replace('.', ',')}`;
    document.getElementById('pdpPrice').style.color = 'var(--danger)'; // opcional, para dar destaque
    document.getElementById('pdpBadge').style.display = 'block';
  } else {
    document.getElementById('pdpOldPrice').style.display = 'none';
  }

  document.getElementById('pdpPrice').textContent = `R$ ${precoFinal.toFixed(2).replace('.', ',')}`;
  
  // Parcelamento (10x sem juros)
  const parcela = precoFinal / 10;
  document.getElementById('pdpInstallment').textContent = `R$ ${parcela.toFixed(2).replace('.', ',')}`;

  // Imagens & Galeria
  const imgUrlPadrao = p.imagem_url || '../assets/images/placeholder.svg';
  const mainImageEl = document.getElementById('mainImage');

  // Galeria de imagens específicas por produto
  const nomeLower = (p.nome || '').toLowerCase();
  const isBoston = nomeLower.includes('boston');
  const isAdiosPro = nomeLower.includes('adios');
  const isHyperboost = nomeLower.includes('hyperboost');
  const isEvoSl = nomeLower.includes('evo');
  let galeriaImagens = [];

  const modeloAsics = ['superblast', 'novablast', 'metaspeed', 'megablast']
    .find(modelo => nomeLower.includes(modelo));
  const modeloNewBalance = nomeLower.includes('rebel') ? 'rebelv5'
    : nomeLower.includes('1080') ? '1080v15'
    : nomeLower.includes('supercomp') ? 'supercomp' : null;
  const modeloNike = ['vaporfly', 'alphafly', 'vomero'].find(modelo => nomeLower.includes(modelo));
  const modeloOlympikus = nomeLower.includes('corre 5') ? 'corre5'
    : nomeLower.includes('turbo') ? 'turbo'
    : nomeLower.includes('supra') ? 'supra' : null;
  if (modeloOlympikus) {
    galeriaImagens = [1, 2, 3, 4].map(numero =>
      `../../imagens/${modeloOlympikus}${modeloOlympikus === 'corre5' ? '-' : ''}${numero}.webp`
    );
  } else if (modeloNike) {
    galeriaImagens = [1, 2, 3, 4].map(numero =>
      `../../imagens/${modeloNike === 'vaporfly' && numero === 2 ? 'vaporfl' : modeloNike}${numero}.avif`
    );
  } else if (modeloNewBalance) {
    galeriaImagens = [1, 2, 3, 4].map(numero =>
      `../../imagens/${modeloNewBalance}${modeloNewBalance === 'supercomp' ? (numero === 1 ? '' : numero) : '-' + numero}.webp`
    );
  } else if (modeloAsics) {
    galeriaImagens = [1, 2, 3, 4].map(numero =>
      `../../imagens/${modeloAsics}${modeloAsics === 'megablast' && numero === 1 ? '' : numero}.webp`
    );
  } else if (/adios\s*pro\s*5/.test(nomeLower)) {
    galeriaImagens = [1, 2, 3, 4].map(numero => `../../imagens/adiospro5-${numero}.avif`);
  } else if (isBoston) {
    galeriaImagens = [
      '../../imagens/boston13-1.webp',
      '../../imagens/boston13-2.webp',
      '../../imagens/boston13-3.webp',
      '../../imagens/boston13-4.webp'
    ];
  } else if (isAdiosPro) {
    galeriaImagens = [
      '../../imagens/adiospro1.avif',
      '../../imagens/adiospro2.avif',
      '../../imagens/adiospro3.avif',
      '../../imagens/adiospro4.avif'
    ];
  } else if (isHyperboost) {
    galeriaImagens = [
      '../../imagens/hyperboostEdge1.avif',
      '../../imagens/hyperboostEdge2.avif',
      '../../imagens/hyperboostEdge3.avif',
      '../../imagens/hyperboostEdge4.avif'
    ];
  } else if (isEvoSl) {
    galeriaImagens = [
      '../../imagens/evosl1.avif',
      '../../imagens/evosl2.avif',
      '../../imagens/evosl3.avif',
      '../../imagens/evosl4.avif'
    ];
  } else {
    galeriaImagens = [imgUrlPadrao];
  }

  mainImageEl.src = galeriaImagens[0] || imgUrlPadrao;

  const thumbsContainer = document.getElementById('thumbnailsContainer');
  if (thumbsContainer) {
    thumbsContainer.innerHTML = '';
    
    galeriaImagens.forEach((imgSrc, index) => {
      const thumb = document.createElement('img');
      thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
      thumb.src = imgSrc;
      thumb.alt = `${p.nome} - Foto ${index + 1}`;
      thumb.onclick = () => {
        // Troca a imagem principal la em cima
        mainImageEl.src = imgSrc;
        // Atualiza a borda/destaque ativo
        document.querySelectorAll('.thumbnails-container .thumbnail').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      };
      thumbsContainer.appendChild(thumb);
    });

    // Se tiver menos de 4 fotos, preenche os espaços vazios mantendo o layout
    for (let i = galeriaImagens.length; i < 4; i++) {
      const emptyThumb = document.createElement('div');
      emptyThumb.className = 'thumbnail placeholder-thumb';
      emptyThumb.innerHTML = `<span>Espaço ${i + 1}</span>`;
      thumbsContainer.appendChild(emptyThumb);
    }
  }

  // Descrição
  const descEl = document.getElementById('pdpDescription');
  if (descEl) {
    descEl.innerHTML = `<p>${p.descricao || 'Nenhuma descrição disponível para este produto.'}</p>`;
  }

  // Estoque
  const btnAddToCart = document.getElementById('btnAddToCart');
  const semEstoque = p.estoque && p.estoque.quantidade === 0;
  if (semEstoque) {
    btnAddToCart.textContent = 'Esgotado';
    btnAddToCart.disabled = true;
    btnAddToCart.classList.remove('btn-primary');
    btnAddToCart.classList.add('btn-ghost');
  } else {
    btnAddToCart.onclick = () => {
      Carrinho.adicionar(p);
      showToast('Produto adicionado ao carrinho!', 'success');
    };
  }
}

// Lógica do Accordion
function toggleAccordion(btn) {
  const content = btn.nextElementSibling;
  const isActive = btn.classList.contains('active');

  // Fechar todos
  document.querySelectorAll('.accordion-header').forEach(b => {
    b.classList.remove('active');
    b.nextElementSibling.style.maxHeight = null;
  });

  if (!isActive) {
    btn.classList.add('active');
    content.style.maxHeight = content.scrollHeight + 'px';
  }
}
