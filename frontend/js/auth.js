/**
 * auth.js — Gerenciamento de autenticação JWT no frontend
 */

const frontendBaseUrl = new URL('../', document.currentScript.src);

const Auth = {
  TOKEN_KEY: 'sk_token',
  USER_KEY: 'sk_user',

  url(caminho = 'index.html') {
    return new URL(caminho, frontendBaseUrl).href;
  },

  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  setToken(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    try {
      const user = JSON.parse(localStorage.getItem(this.USER_KEY));
      return user && typeof user === 'object' && !Array.isArray(user) ? user : null;
    } catch { return null; }
  },

  isLoggedIn() {
    const token = this.getToken();
    if (!token) return false;
    try {
      // Decodifica o payload JWT (sem verificar assinatura — apenas para checar expiração)
      const parte = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(parte));
      return payload.exp > Date.now() / 1000;
    } catch { return false; }
  },

  isAdmin() {
    const user = this.getUser();
    return Boolean(user && String(user.tipo || user.tipo_usuario).toUpperCase() === 'ADMIN');
  },

  async logout() {
    try { if (this.getToken()) await Api.post('/auth/logout', {}); } catch { /* A saída local continua disponível sem rede. */ }
    this.clearSession();
    sessionStorage.removeItem('sk_redirect');
    window.location.href = this.url();
  },

  /**
   * Guard para páginas privadas — redireciona para login se não autenticado
   */
  requireAuth(redirectUrl = this.url('pages/login.html')) {
    if (!this.isLoggedIn()) {
      this.clearSession();
      sessionStorage.setItem('sk_redirect', window.location.pathname + window.location.search);
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  },

  /**
   * Guard para páginas de admin
   */
  requireAdmin() {
    if (!this.requireAuth()) return false;
    if (!this.isAdmin()) {
      window.location.href = this.url();
      return false;
    }
    return true;
  },

  consumeRedirect() {
    const salvo = sessionStorage.getItem('sk_redirect');
    sessionStorage.removeItem('sk_redirect');
    if (salvo) {
      try {
        const destino = new URL(salvo, window.location.href);
        if (destino.origin === frontendBaseUrl.origin && destino.pathname.startsWith(frontendBaseUrl.pathname) &&
            !/\/(login|cadastro)\.html$/.test(destino.pathname)) return destino.href;
      } catch { /* Ignora destinos inválidos. */ }
    }
    return this.url();
  }
};

/**
 * Atualiza o estado visual da navbar baseado no usuário logado
 */
function atualizarNavbar() {
  const user = Auth.getUser();
  const btnLogin = document.getElementById('btnLogin');

  if (btnLogin && Auth.isLoggedIn() && user) {
    btnLogin.textContent = String(user.nome || 'Minha conta').split(' ')[0];
    btnLogin.href = Auth.url('pages/perfil.html');
    btnLogin.setAttribute('aria-label', 'Minha conta');
    btnLogin.style.background = 'rgba(59,130,246,0.15)';
    btnLogin.style.borderColor = 'rgba(59,130,246,0.4)';
    btnLogin.style.color = 'var(--accent-primary)';
  }
  const menu = document.getElementById('navMenu');
  if (menu && Auth.isLoggedIn() && Auth.isAdmin() && !document.getElementById('linkAdmin')) {
    const link = document.createElement('a');
    link.id = 'linkAdmin';
    link.className = 'navbar-link';
    link.href = Auth.url('pages/admin.html');
    link.textContent = 'Administração';
    menu.appendChild(link);
  }
}

/**
 * Toast notifications
 */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'}`;
  const icon = document.createElement('span');
  icon.textContent = icons[type] || '•';
  const text = document.createElement('span');
  text.textContent = message;
  toast.append(icon, text);
  container.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// Mobile menu toggle
function toggleMenu() {
  const menu = document.getElementById('navMenu');
  const hamburger = document.getElementById('hamburger');
  if (menu) menu.classList.toggle('open');
  if (hamburger) hamburger.classList.toggle('open');
  if (hamburger && menu) hamburger.setAttribute('aria-expanded', String(menu.classList.contains('open')));
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    if (window.scrollY > 40) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  }
});

// Init
document.addEventListener('DOMContentLoaded', atualizarNavbar);

window.Auth = Auth;
window.showToast = showToast;
window.toggleMenu = toggleMenu;
