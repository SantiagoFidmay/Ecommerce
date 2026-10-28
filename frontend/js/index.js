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

    try { const res = await Api.getCategorias(); renderizarCategorias(grid, res.categorias || []); }
    catch { grid.replaceChildren(Loja.el('p', 'loja-subtitle', 'As categorias não puderam ser carregadas agora.')); }
}

function renderizarCategorias(grid, categorias) {
    grid.replaceChildren(); grid.style.gridTemplateColumns = `repeat(${Math.max(1,Math.min(categorias.length,4))},1fr)`;
    categorias.forEach(c => { const link = Loja.el('a', 'category-card'); link.href = `pages/catalogo.html?categoria=${c.codCategoria}`; link.append(Loja.el('span', 'category-icon', c.icone || '↗'), Loja.el('div', 'category-name', c.nome)); grid.appendChild(link); });
}

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
            grid.replaceChildren(Loja.el('p', 'loja-subtitle', 'Nenhum destaque cadastrado no momento. Explore o catálogo completo.'))
            return
        }
        renderizarProdutos(grid, produtos)
    } catch {
        grid.replaceChildren(Loja.el('p', 'loja-subtitle', 'Não foi possível carregar os produtos agora. Atualize a página para tentar novamente.'))
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
    grid.replaceChildren(); produtos.forEach(p => grid.appendChild(Loja.card(p)));
}
function adicionarAoCarrinho(produto) { location.href = `pages/produto.html?id=${produto.codProduto || produto.id}`; }

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
window.adicionarAoCarrinho = adicionarAoCarrinho
