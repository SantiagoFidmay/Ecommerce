/**
 * auth.js — Gerenciamento de autenticação JWT no frontend
 */

const Auth = {
  TOKEN_KEY: 'sk_token',
  USER_KEY: 'sk_user',

  setToken(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(this.USER_KEY));
    } catch { return null; }
  },

  isLoggedIn() {
    const token = this.getToken();
    if (!token) return false;
    try {
      // Decodifica o payload JWT (sem verificar assinatura — apenas para checar expiração)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch { return false; }
  },

  isAdmin() {
    const user = this.getUser();
    return user && user.tipo === 'admin';
  },

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    window.location.href = '/index.html';
  },

  /**
   * Guard para páginas privadas — redireciona para login se não autenticado
   */
  requireAuth(redirectUrl = '/pages/login.html') {
    if (!this.isLoggedIn()) {
      sessionStorage.setItem('sk_redirect', window.location.pathname);
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  },

  /**
   * Guard para páginas de admin
   */
  requireAdmin() {
    if (!this.isLoggedIn()) {
      window.location.href = '/pages/login.html';
      return false;
    }
    if (!this.isAdmin()) {
      window.location.href = '/index.html';
      return false;
    }
    return true;
  }
};

/**
 * Atualiza o estado visual da navbar baseado no usuário logado
 */
function atualizarNavbar() {
  const user = Auth.getUser();
  const btnLogin = document.getElementById('btnLogin');

  if (btnLogin && Auth.isLoggedIn() && user) {
    btnLogin.textContent = user.nome.split(' ')[0];
    btnLogin.href = user.tipo === 'admin' ? 'pages/admin/dashboard.html' : 'pages/perfil.html';
    btnLogin.style.background = 'rgba(59,130,246,0.15)';
    btnLogin.style.borderColor = 'rgba(59,130,246,0.4)';
    btnLogin.style.color = 'var(--accent-primary)';
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
