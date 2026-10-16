/** Landing page: vídeo de abertura e produtos em destaque. */
document.addEventListener('DOMContentLoaded', () => {
    initVideoHero()
    initShowcaseHover()
    carregarCategorias()
    carregarProdutosDestaque()
    initIntersectionAnimations()
})

function initVideoHero() {
    const video = document.getElementById('heroVideo')
    if (!video) return
    video.muted = true
    const play = () => video.play().catch(() => {})
    video.addEventListener('canplay', play, { once: true })
    document.addEventListener('pointerdown', () => {
        if (video.paused) play()
    }, { once: true })
    play()
}

function initShowcaseHover() {
    const showcaseItems = document.querySelectorAll('.showcase-item')
    showcaseItems.forEach(item => {
        const nome = item.querySelector('.showcase-name')?.textContent.trim()
        if (nome) {
            Api.buscarProdutos({ nome }).then(res => {
                const produto = res.produtos?.find(p => p.nome === nome)
                if (produto) item.href = `pages/produto.html?id=${produto.codProduto}`
            }).catch(() => {})
        }
        const video = item.querySelector('.showcase-video')
        if (!video) return
        item.addEventListener('mouseenter', () => video.play().catch(() => {}))
        item.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0 })
    })
}


/* ═══════════════════════════════════════════════
   CATEGORIAS
═══════════════════════════════════════════════ */
async function carregarCategorias() {
    const grid = document.getElementById('categoriesGrid')
    if (!grid) return

    const categoriasPadrao = [
        { codCategoria: 1, nome: 'Corrida',   icone: '🏃', count: '120+ produtos' },
        { codCategoria: 2, nome: 'Futebol',   icone: '⚽', count: '85+ produtos'  },
        { codCategoria: 3, nome: 'Basquete',  icone: '🏀', count: '60+ produtos'  },
        { codCategoria: 4, nome: 'Treino',    icone: '💪', count: '95+ produtos'  },
        { codCategoria: 5, nome: 'Casual',    icone: '👟', count: '150+ produtos' },
        { codCategoria: 6, nome: 'Trilha',    icone: '🥾', count: '40+ produtos'  },
        { codCategoria: 7, nome: 'Natação',   icone: '🏊', count: '30+ produtos'  },
        { codCategoria: 8, nome: 'Ciclismo',  icone: '🚴', count: '25+ produtos'  }
    ]

    try {
        const res = await Api.getCategorias()
        const lista = res.categorias?.length > 0 ? res.categorias : categoriasPadrao
        renderizarCategorias(grid, lista)
    } catch {
        renderizarCategorias(grid, categoriasPadrao)
    }
}

function renderizarCategorias(grid, categorias) {
    const cols = Math.min(categorias.length, 4)
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
    grid.innerHTML = categorias.slice(0, 8).map(cat => `
        <a href="pages/catalogo.html?categoria=${cat.codCategoria || cat.id}" class="category-card" id="cat-${cat.codCategoria || cat.id}">
            <span class="category-icon">${cat.icone || '👟'}</span>
            <div class="category-name">${cat.nome}</div>
            <div class="category-count">${cat.count || ''}</div>
        </a>
    `).join('')
}


/* ═══════════════════════════════════════════════
   PRODUTOS EM DESTAQUE
═══════════════════════════════════════════════ */
async function carregarProdutosDestaque() {
    const grid = document.getElementById('produtosDestaque')
    if (!grid) return

    // Skeleton loading
    grid.innerHTML = Array(4).fill('').map(() => `
        <div style="
            background:linear-gradient(90deg,var(--bg-card) 25%,var(--bg-card-hover) 50%,var(--bg-card) 75%);
            background-size:200% 100%;animation:shimmer 1.5s infinite;
            border-radius:var(--radius-xl);height:380px;
        "></div>
    `).join('')

    try {
        const res = await Api.getProdutos({ destaque: 'true', limite: 8 })
        const produtos = res.produtos || []
        if (produtos.length === 0) {
            renderizarProdutosDemo(grid)
            return
        }
        renderizarProdutos(grid, produtos)
    } catch {
        renderizarProdutosDemo(grid)
    }
}

function getImagemProduto(p) {
    if (p.imagem_url) {
        return p.imagem_url.replace(/^(?:\.\.\/)*imagens\//, '../imagens/');
    }
    const nomeLower = (p.nome || '').toLowerCase();
    if (/adios\s*pro\s*5/.test(nomeLower)) return '../imagens/adiospro5-1.avif';
    if (nomeLower.includes('boston')) return '../imagens/boston13-1.webp';
    if (nomeLower.includes('adios')) return '../imagens/adiospro1.avif';
    if (nomeLower.includes('hyperboost')) return '../imagens/hyperboostEdge1.avif';
    if (nomeLower.includes('evo')) return '../imagens/evosl1.avif';
    if (p.imagem_url) {
        // Os arquivos compartilhados ficam ao lado da pasta frontend.
        return p.imagem_url.replace(/^(?:\.\.\/)*imagens\//, '../imagens/');
    }
    return 'assets/images/placeholder.svg';
}

function renderizarProdutos(grid, produtos) {
    grid.innerHTML = produtos.map(p => {
        const preco    = parseFloat(p.preco_promocional || p.preco)
        const semEstoque = p.estoqueProduto && p.estoqueProduto.quantidade === 0
        const temPromo   = p.preco_promocional && parseFloat(p.preco_promocional) < parseFloat(p.preco)
        const imgSrc   = getImagemProduto(p)

        return `
            <div class="produto-card" id="prod-${p.codProduto || p.id}" 
                onclick="window.location.href='pages/produto.html?id=${p.codProduto || p.id}'">
                <div class="produto-card-img">
                    ${temPromo ? '<span class="produto-card-badge">🔥 Promoção</span>' : ''}
                    <img src="${imgSrc}" alt="${p.nome}"
                         onerror="this.onerror=null;this.src='assets/images/placeholder.svg'">
                    ${semEstoque ? '<div class="produto-card-estoque-zero"><span>Esgotado</span></div>' : ''}
                </div>
                <div class="produto-card-body">
                    <div class="produto-card-marca">${p.marca || p.categoriaProduto?.nome || ''}</div>
                    <div class="produto-card-nome">${p.nome}</div>
                    <div class="produto-card-categoria">
                        ${p.categoriaProduto?.icone || ''} ${p.categoriaProduto?.nome || ''}
                    </div>
                    <div class="produto-card-footer">
                        <div class="produto-card-preco">
                            ${temPromo ? `<span class="produto-card-preco-old">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</span>` : ''}
                            <span class="produto-card-preco-current${temPromo ? ' em-promo' : ''}">
                                R$ ${preco.toFixed(2).replace('.', ',')}
                            </span>
                        </div>
                        <button class="btn-cart" title="Adicionar ao carrinho"
                            onclick="event.stopPropagation(); adicionarAoCarrinho(${JSON.stringify(p).replace(/"/g, '&quot;')})"
                            ${semEstoque ? 'disabled' : ''}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `
    }).join('')
}

function renderizarProdutosDemo(grid) {
    const produtosDemo = [
        { codProduto: 1, nome: 'Adizero Boston 13',  marca: 'Adidas', preco: '1099.90', preco_promocional: '899.90',  categoriaProduto: { nome: 'Corrida', icone: '🏃' }, imagem_url: '../imagens/boston13-1.webp', estoqueProduto: { quantidade: 5  } },
        { codProduto: 2, nome: 'Adizero Adios Pro 4', marca: 'Adidas', preco: '1599.90', preco_promocional: null,     categoriaProduto: { nome: 'Corrida', icone: '🏃' }, imagem_url: '../imagens/adiospro1.avif', estoqueProduto: { quantidade: 10 } },
        { codProduto: 3, nome: 'Hyperboost Edge',    marca: 'Adidas', preco: '799.90',  preco_promocional: '699.90',  categoriaProduto: { nome: 'Treino', icone: '💪' }, imagem_url: '../imagens/hyperboostEdge1.avif', estoqueProduto: { quantidade: 2  } },
        { codProduto: 4, nome: 'Adizero EVO SL',     marca: 'Adidas', preco: '1099.00',  preco_promocional: null,     categoriaProduto: { nome: 'Corrida', icone: '🏃' }, imagem_url: '../imagens/evosl1.avif', estoqueProduto: { quantidade: 8  } }
    ]
    renderizarProdutos(grid, produtosDemo)
}

function adicionarAoCarrinho(produto) {
    if (typeof Carrinho !== 'undefined') Carrinho.adicionar({
        ...produto, id: produto.codProduto || produto.id,
        estoque: produto.estoqueProduto || produto.estoque,
        imagem_url: getImagemProduto(produto)
    })
}


/* ═══════════════════════════════════════════════
   INTERSECTION OBSERVER — Animate on scroll
═══════════════════════════════════════════════ */
function initIntersectionAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards'
                observer.unobserve(entry.target)
            }
        })
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' })

    document.querySelectorAll('.category-card, .produto-card, .feature-card, .showcase-item')
        .forEach(el => {
            el.style.opacity = '0'
            observer.observe(el)
        })
}


/* ═══════════════════════════════════════════════
   NEWSLETTER
═══════════════════════════════════════════════ */
function submitNewsletter(event) {
    event.preventDefault()
    const email = document.getElementById('newsletterEmail')?.value
    if (email) {
        showToast('Obrigado! Você receberá nossas novidades em breve. 🎉', 'success')
        document.getElementById('newsletterForm').reset()
    }
}

window.adicionarAoCarrinho = adicionarAoCarrinho
window.submitNewsletter    = submitNewsletter
