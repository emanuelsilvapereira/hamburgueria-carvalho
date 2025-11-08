/* js/script.js
   Script global: partials, tema, reveal, mobile menu, forms, modal, e carrinho (localStorage).
*/

document.addEventListener('DOMContentLoaded', () => {
  loadPartials().then(() => {
    // só roda depois de carregar partials (header/footer)
    setupTheme();
    setupReveal();
    setupMobileMenu();
    setupContactForm();
    setupMenuModal();
    highlightActiveNav();
    updateCartCount(); // atualiza contador no header
  });
});

/* -------- carregar header/footer via partials -------- */
async function loadPartials() {
  const header = document.getElementById('headerPlaceholder');
  const footer = document.getElementById('footerPlaceholder');
  try {
    const [h, f] = await Promise.all([
      fetch('partials/header.html').then(r => r.text()),
      fetch('partials/footer.html').then(r => r.text())
    ]);
    header.innerHTML = h;
    footer.innerHTML = f;

    // adicionar listeners para botão de tema e menu
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('menuToggle')?.addEventListener('click', toggleMobileNav);

    // close mobile nav on click outside (simples)
    document.addEventListener('click', (e) => {
      const nav = document.querySelector('.main-nav');
      const toggle = document.getElementById('menuToggle');
      if (!nav || !toggle) return;
      if (!nav.contains(e.target) && !toggle.contains(e.target) && window.innerWidth <= 600) {
        nav.style.display = 'none';
      }
    });

  } catch (err) {
    console.warn('Erro ao carregar partials (se estiver abrindo por file://, use um servidor local):', err);
  }
}

/* -------- tema dark/light -------- */
function setupTheme() {
  const saved = localStorage.getItem('hc-theme');
  if (saved === 'light') document.documentElement.classList.add('light');
}

function toggleTheme() {
  const isLight = document.documentElement.classList.toggle('light');
  localStorage.setItem('hc-theme', isLight ? 'light' : 'dark');
}

/* -------- mobile nav -------- */
function toggleMobileNav() {
  const nav = document.querySelector('.main-nav');
  if (!nav) return;
  nav.style.display = (nav.style.display === 'flex' ? 'none' : 'flex');
}

/* -------- highlight link ativa -------- */
function highlightActiveNav() {
  const links = document.querySelectorAll('.main-nav a, nav a');
  const current = location.pathname.split('/').pop() || 'index.html';
  links.forEach(a => {
    const href = a.getAttribute('href');
    if (href === current) a.classList.add('active');
  });
}

/* -------- reveal on scroll (IntersectionObserver) -------- */
function setupReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = el.dataset.delay ? Number(el.dataset.delay) : 0;
        setTimeout(() => el.classList.add('revealed'), delay * 1000);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal-up').forEach(el => obs.observe(el));
}

/* -------- contact form (simples) -------- */
function setupContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();
    if (!name || !email || !message) {
      showToast('Preencha todos os campos.');
      return;
    }
    showToast('🍔 Mensagem enviada! Responderemos em breve.');
    form.reset();
  });
}

/* -------- modal do cardápio e integração com carrinho -------- */
function setupMenuModal() {
  const modal = document.getElementById('productModal');
  if (!modal) return;

  const openButtons = document.querySelectorAll('.open-modal');
  const modalName = document.getElementById('modalName');
  const modalPrice = document.getElementById('modalPrice');
  const closeBtns = modal.querySelectorAll('.modal-close');
  const addToCartBtn = document.getElementById('addToCart');

  openButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      const price = btn.dataset.price;
      modalName.textContent = name;
      modalPrice.textContent = `R$ ${price}`;
      modal.setAttribute('aria-hidden', 'false');

      // guarda dados no botão "Adicionar ao pedido" para uso posterior
      if (addToCartBtn) {
        addToCartBtn.dataset.name = name;
        addToCartBtn.dataset.price = price;
      }
    });
  });

  closeBtns.forEach(b => b.addEventListener('click', () => {
    modal.setAttribute('aria-hidden', 'true');
  }));

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.setAttribute('aria-hidden', 'true');
  });

  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      const name = addToCartBtn.dataset.name;
      const price = addToCartBtn.dataset.price;
      if (!name || !price) {
        showToast('Erro ao adicionar item.');
        return;
      }
      addItemToCart({ name, price: Number(price.replace(',','.')) || Number(price) , qty: 1 });
      showToast('✅ Item adicionado ao pedido.');
      modal.setAttribute('aria-hidden', 'true');
    });
  }

  // também aceita adicionar diretamente de botões "Pedir" se existirem (ex: cards)
  document.querySelectorAll('[data-add-to-cart]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      const price = btn.dataset.price;
      addItemToCart({ name, price: Number(price.replace(',','.')) || Number(price), qty: 1 });
      showToast('✅ Item adicionado ao pedido.');
    });
  });
}

/* -------- CARRINHO (localStorage) -------- */

const CART_KEY = 'hc-cart';

/** retorna array de itens */
function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Erro ao ler cart:', err);
    return [];
  }
}

/** salva array de itens */
function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
  } catch (err) {
    console.error('Erro ao salvar cart:', err);
  }
}

/** adiciona item (se já existe, incrementa qty) */
function addItemToCart(item) {
  const cart = getCart();
  const idx = cart.findIndex(i => i.name === item.name);
  if (idx > -1) {
    cart[idx].qty = (cart[idx].qty || 1) + (item.qty || 1);
  } else {
    cart.push({ name: item.name, price: Number(item.price) || 0, qty: item.qty || 1 });
  }
  saveCart(cart);
}

/** remove item por nome */
function removeItemFromCart(name) {
  const cart = getCart().filter(i => i.name !== name);
  saveCart(cart);
}

/** atualiza quantidade (>=1) */
function updateItemQty(name, qty) {
  const cart = getCart();
  const idx = cart.findIndex(i => i.name === name);
  if (idx > -1) {
    cart[idx].qty = Math.max(1, Number(qty) || 1);
    saveCart(cart);
  }
}

/** limpa carrinho */
function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartCount();
}

/** calcula total */
function cartTotal() {
  return getCart().reduce((acc, it) => acc + (Number(it.price) * Number(it.qty)), 0);
}

/** atualiza badge no header */
function updateCartCount() {
  const badge = document.getElementById('cartCountBadge');
  if (!badge) return;
  const totalQty = getCart().reduce((acc, it) => acc + Number(it.qty || 0), 0);
  badge.textContent = totalQty;
  badge.style.display = totalQty ? 'inline-block' : 'none';
}

/* -------- Funções para a página pedido.html (se estiver nesta página) -------- */
function renderCartPage() {
  const container = document.getElementById('cartContainer');
  const totalEl = document.getElementById('cartTotal');
  if (!container || !totalEl) return;
  const cart = getCart();
  container.innerHTML = '';
  if (!cart.length) {
    container.innerHTML = `<p>Seu pedido está vazio. <a href="cardapio.html">Ver cardápio</a></p>`;
    totalEl.textContent = 'R$ 0,00';
    return;
  }

  cart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <div class="cart-name">${escapeHtml(item.name)}</div>
      <div class="cart-controls">
        <input type="number" min="1" value="${item.qty}" data-name="${escapeHtml(item.name)}" class="cart-qty">
        <span class="cart-price">R$ ${formatPrice(item.price * item.qty)}</span>
        <button class="btn btn-outline btn-remove" data-name="${escapeHtml(item.name)}">Remover</button>
      </div>
    `;
    container.appendChild(row);
  });

  // listeners
  container.querySelectorAll('.cart-qty').forEach(input => {
    input.addEventListener('change', (e) => {
      const name = e.target.dataset.name;
      const qty = e.target.value;
      updateItemQty(name, qty);
      renderCartPage(); // re-render para atualizar total
    });
  });

  container.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      removeItemFromCart(name);
      renderCartPage();
      showToast('Item removido.');
    });
  });

  totalEl.textContent = `R$ ${formatPrice(cartTotal())}`;
  updateCartCount();
}

/* -------- helpers -------- */
function formatPrice(v) {
  return Number(v).toFixed(2).replace('.',',');
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));
}

/* -------- toast simples (reuso) -------- */
function showToast(msg, timeout = 2500) {
  let t = document.getElementById('hc-toast');
  if (t) t.remove();
  t = document.createElement('div');
  t.id = 'hc-toast';
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed', bottom: '22px', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '10px 16px', borderRadius:'10px', zIndex:2000
  });
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), timeout);
}

/* -------- mobile menu helper (hide on resize) -------- */
function setupMobileMenu() {
  window.addEventListener('resize', () => {
    const nav = document.querySelector('.main-nav');
    if (!nav) return;
    if (window.innerWidth > 600) nav.style.display = 'flex';
    else nav.style.display = 'none';
  });
}

/* If we are on pedido.html, initialize its UI after DOM loads */
document.addEventListener('DOMContentLoaded', () => {
  if (location.pathname.split('/').pop() === 'pedido.html') {
    // small timeout to ensure partials loaded and cart badge exists
    setTimeout(() => {
      renderCartPage();
      // finalize order button
      const finalizeBtn = document.getElementById('finalizeOrder');
      finalizeBtn?.addEventListener('click', () => {
        const cart = getCart();
        if (!cart.length) {
          showToast('Seu pedido está vazio.');
          return;
        }
        // Simula envio do pedido
        showToast('✅ Pedido realizado! Checaremos o pagamento na chegada.');
        clearCart();
        renderCartPage();
      });
    }, 250);
  }
});
