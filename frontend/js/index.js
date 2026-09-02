/**
 * index.js — Landing Page Script
 * 
 * Comportamento do Hero Video:
 * - A página fica TRAVADA no topo enquanto o vídeo toca
 * - O vídeo avança COM O SCROLL do usuário (efeito scrubbing)
 * - A velocidade é controlada pelo scroll — mais lento pois o range é longo
 * - Só quando o vídeo termina, a página desce normalmente
 */

document.addEventListener('DOMContentLoaded', () => {
    initScrollVideoHero()
    initShowcaseHover()
    carregarCategorias()
    carregarProdutosDestaque()
    initIntersectionAnimations()
})


/* ═══════════════════════════════════════════════════════════════
   HERO VIDEO — SCROLL TRAVADO + VIDEO-DRIVEN
   
   Lógica:
   1. A hero-container tem height: 300vh (zona de scroll do vídeo)
   2. A .hero fica position:sticky — gruda no topo
   3. Enquanto o usuário está dentro da hero-container,
      o scroll é interceptado para avançar o currentTime do vídeo
   4. O vídeo usa playbackRate baixo + mapeamento lento (mais "cinemático")
   5. Quando o vídeo termina (ou o scroll ultrapassa a container),
      o scroll é liberado e a página continua normalmente
═══════════════════════════════════════════════════════════════ */
function initScrollVideoHero() {
    const video       = document.getElementById('heroVideo')
    const container   = document.getElementById('heroContainer')
    const progressFill = document.getElementById('videoProgressFill')
    const scrollHint  = document.getElementById('scrollIndicator')
    const heroContent = document.getElementById('heroContent')

    if (!video || !container) return

    // ── Configurações ──
    const SCROLL_MULTIPLIER = 0.35   // Distância de scroll menor: desce o site bem mais rápido
    const VIDEO_OPACITY_START = 0.7  // Opacidade inicial do vídeo

    let videoReady    = false
    let videoFinished = false
    let duration      = 0
    let targetTime    = 0
    let currentTimeSmoothed = 0
    let animationFrameId = null

    // Loop de interpolação suave (LERP) para transições contínuas e ultra fluidas
    function smoothVideoPlayback() {
        if (!videoReady) return

        // Interpolação suave e ágil (fator 0.14 para resposta rápida sem perder fluidez)
        currentTimeSmoothed += (targetTime - currentTimeSmoothed) * 0.14

        if (Math.abs(currentTimeSmoothed - video.currentTime) > 0.003) {
            video.currentTime = currentTimeSmoothed
        }

        // Atualiza barra de progresso suavemente
        const progress = duration > 0 ? (currentTimeSmoothed / duration) : 0
        if (progressFill) progressFill.style.width = `${progress * 100}%`

        // Vídeo terminou suavemente → libera scroll
        if (videoFinished && Math.abs(currentTimeSmoothed - duration) < 0.1) {
            cancelAnimationFrame(animationFrameId)
            return
        }

        animationFrameId = requestAnimationFrame(smoothVideoPlayback)
    }

    // Aguarda metadados do vídeo
    video.addEventListener('loadedmetadata', () => {
        duration   = video.duration
        videoReady = true
        video.currentTime = 0
        targetTime = 0
        currentTimeSmoothed = 0
        console.log(`🎬 Vídeo carregado. Duração: ${duration.toFixed(1)}s`)
        animationFrameId = requestAnimationFrame(smoothVideoPlayback)
    })

    // Fallback se vídeo não carregar
    video.addEventListener('error', () => {
        console.warn('⚠️ Vídeo não carregado. Liberando scroll.')
        videoFinished = true
        releaseScroll()
    })

    // ── Wheel / Touch handler ──
    let accumulated = 0

    function onWheel(e) {
        if (!videoReady || videoFinished) return

        const containerRect = container.getBoundingClientRect()

        // Só age se a hero ainda está visível no topo
        if (containerRect.top > 10) return
        if (window.scrollY > container.offsetHeight) return

        e.preventDefault()

        // Acumula o delta do scroll de forma ágil
        accumulated += e.deltaY * 0.95
        if (accumulated < 0) accumulated = 0

        // Define o tempo alvo (target)
        const pixelsPorSegundo = window.innerHeight * SCROLL_MULTIPLIER
        targetTime = Math.min(accumulated / pixelsPorSegundo, duration)

        // Fade do indicador de scroll
        if (scrollHint) {
            scrollHint.style.opacity = accumulated > 30 ? '0' : '1'
        }

        // Efeito parallax suave no conteúdo
        if (heroContent) {
            const fadeOut = Math.max(0, 1 - (accumulated / (window.innerHeight * 0.8)))
            heroContent.style.opacity   = fadeOut
            heroContent.style.transform = `translateY(${accumulated * 0.15}px)`
        }

        // Quando chega ao fim do vídeo → libera imediatamente a descida do site
        if (targetTime >= duration - 0.1) {
            videoFinished = true
            targetTime = duration
            releaseScroll()

            setTimeout(() => {
                const nextSection = document.getElementById('videoProgressBar')
                if (nextSection) {
                    nextSection.scrollIntoView({ behavior: 'smooth' })
                }
            }, 180)
        }
    }

    // Touch support
    let touchStartY = 0
    function onTouchStart(e) { touchStartY = e.touches[0].clientY }
    function onTouchMove(e) {
        if (!videoReady || videoFinished) return
        const delta = touchStartY - e.touches[0].clientY
        touchStartY = e.touches[0].clientY
        onWheel({ deltaY: delta * 1.8, preventDefault: () => e.preventDefault() })
    }

    function lockScroll() {
        window.addEventListener('wheel',     onWheel,     { passive: false })
        window.addEventListener('touchstart', onTouchStart, { passive: true })
        window.addEventListener('touchmove',  onTouchMove,  { passive: false })
    }

    function releaseScroll() {
        window.removeEventListener('wheel',     onWheel)
        window.removeEventListener('touchstart', onTouchStart)
        window.removeEventListener('touchmove',  onTouchMove)

        // Mostra a barra de progresso como completa
        if (progressFill) {
            progressFill.style.width = '100%'
            progressFill.style.boxShadow = '0 0 16px var(--accent-primary)'
        }
    }

    // Começa travando o scroll quando o usuário chega ao hero
    // Usa IntersectionObserver para só travar quando a hero está visível
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !videoFinished && videoReady) {
                lockScroll()
            } else if (!entry.isIntersecting) {
                // Saiu da área — garante que o scroll está livre
                if (videoFinished) releaseScroll()
            }
        })
    }, { threshold: 0.5 })

    observer.observe(document.getElementById('hero'))

    // Também bloqueia imediatamente ao carregar (se já estiver no topo)
    video.addEventListener('loadedmetadata', () => {
        if (window.scrollY < 100) lockScroll()
    })
}


/* ═══════════════════════════════════════════════
   SHOWCASE VIDEOS — Play on hover
═══════════════════════════════════════════════ */
function initShowcaseHover() {
    const showcaseItems = document.querySelectorAll('.showcase-item')
    showcaseItems.forEach(item => {
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
    const nomeLower = (p.nome || '').toLowerCase();
    if (nomeLower.includes('boston') || p.codProduto == 1 || p.id == 1) return 'imagens/boston13-1.webp';
    if (nomeLower.includes('adios') || p.codProduto == 2 || p.id == 2) return 'imagens/adiospro1.avif';
    if (nomeLower.includes('hyperboost') || p.codProduto == 3 || p.id == 3) return 'imagens/hyperboostEdge1.avif';
    if (nomeLower.includes('evo') || p.codProduto == 4 || p.id == 4) return 'imagens/evosl1.avif';
    if (p.imagem_url) {
        // Se vier com caminho relativo '../imagens/', remove o '../' para a index.html na raiz
        return p.imagem_url.replace(/^\.\.\//, '');
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
                         onerror="this.src='assets/images/placeholder.svg'">
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
        { codProduto: 1, nome: 'Adizero Boston 13',  marca: 'Adidas', preco: '1099.90', preco_promocional: '899.90',  categoriaProduto: { nome: 'Corrida', icone: '🏃' }, imagem_url: 'imagens/boston13-1.webp', estoqueProduto: { quantidade: 5  } },
        { codProduto: 2, nome: 'Adizero Adios Pro 4', marca: 'Adidas', preco: '1599.90', preco_promocional: null,     categoriaProduto: { nome: 'Corrida', icone: '🏃' }, imagem_url: 'imagens/adiospro1.avif', estoqueProduto: { quantidade: 10 } },
        { codProduto: 3, nome: 'Hyperboost Edge',    marca: 'Adidas', preco: '799.90',  preco_promocional: '699.90',  categoriaProduto: { nome: 'Treino', icone: '💪' }, imagem_url: 'imagens/hyperboostEdge1.avif', estoqueProduto: { quantidade: 2  } },
        { codProduto: 4, nome: 'Adizero EVO SL',     marca: 'Adidas', preco: '649.90',  preco_promocional: null,     categoriaProduto: { nome: 'Corrida', icone: '🏃' }, imagem_url: 'imagens/evosl1.avif', estoqueProduto: { quantidade: 8  } }
    ]
    renderizarProdutos(grid, produtosDemo)
}

function adicionarAoCarrinho(produto) {
    if (typeof Carrinho !== 'undefined') Carrinho.adicionar(produto)
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
