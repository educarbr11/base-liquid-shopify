/* Drawer e melhoria progressiva do carrinho — Shopify Cart AJAX API. */
(function () {
  'use strict';

  var drawer = document.querySelector('[data-cart-drawer]');
  var content = drawer && drawer.querySelector('[data-cart-drawer-content]');
  var status = drawer && drawer.querySelector('.cart-drawer__status');
  var lastTrigger = null;
  var cartCache = null;
  var root = window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/';

  function text(name, fallback) { return drawer && drawer.dataset[name] ? drawer.dataset[name] : fallback; }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }
  function money(cents, currency) {
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'BRL' }).format(cents / 100); }
    catch (e) { return 'R$ ' + (cents / 100).toFixed(2).replace('.', ','); }
  }
  function updateCartCount(count) {
    document.querySelectorAll('[data-cart-count]').forEach(function (el) { el.textContent = count; });
  }
  function setStatus(message) { if (status) status.textContent = message || ''; }

  function itemMarkup(item, currency) {
    var image = item.image ? '<a href="' + escapeHtml(item.url) + '"><img class="cart-drawer__image" src="' + escapeHtml(item.image) + '&width=176" alt=""></a>' : '<div class="cart-drawer__image"></div>';
    var variant = item.variant_title && item.variant_title !== 'Default Title' ? '<p class="cart-drawer__variant">' + escapeHtml(item.variant_title) + '</p>' : '';
    return '<article class="cart-drawer__item" data-cart-key="' + escapeHtml(item.key) + '">' + image +
      '<div class="cart-drawer__item-info"><a class="cart-drawer__item-title" href="' + escapeHtml(item.url) + '">' + escapeHtml(item.product_title) + '</a>' + variant +
      '<div class="cart-drawer__item-price">' + money(item.final_line_price, currency) + '</div>' +
      '<div class="cart-drawer__item-actions"><div class="cart-drawer__quantity" aria-label="Quantidade">' +
      '<button type="button" data-cart-quantity="' + (item.quantity - 1) + '" aria-label="Diminuir quantidade">−</button><span>' + item.quantity + '</span>' +
      '<button type="button" data-cart-quantity="' + (item.quantity + 1) + '" aria-label="Aumentar quantidade">+</button></div>' +
      '<button type="button" class="cart-drawer__remove" data-cart-remove>' + escapeHtml(text('removeLabel', 'Remover')) + '</button></div></div></article>';
  }

  function render(cart) {
    cartCache = cart;
    updateCartCount(cart.item_count);
    if (!content) return;
    if (!cart.item_count) {
      content.innerHTML = '<div class="cart-drawer__empty"><div class="cart-drawer__empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 6h15l-1.5 9h-12L6 6Zm0 0-.5-3H3"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg></div><h3>Carrinho vazio</h3><p>' + escapeHtml(text('emptyText', 'Seu carrinho está vazio.')) + '</p><button type="button" class="button button--secondary" data-cart-drawer-close>' + escapeHtml(text('continueLabel', 'Continuar comprando')) + '</button></div>';
      return;
    }
    var items = cart.items.map(function (item) { return itemMarkup(item, cart.currency); }).join('');
    var shipping = '';
    if (drawer.dataset.freeShippingEnabled === 'true') {
      var goal = Number(drawer.dataset.freeShippingGoal || 0);
      var remaining = Math.max(0, goal - cart.total_price);
      var progress = goal > 0 ? Math.min(100, cart.total_price / goal * 100) : 100;
      var shippingText = remaining > 0 ? 'Faltam <strong>' + money(remaining, cart.currency) + '</strong> para o frete grátis.' : '<strong>Você ganhou frete grátis!</strong>';
      shipping = '<div class="cart-drawer__shipping"><p class="cart-drawer__shipping-text">' + shippingText + '</p><div class="cart-drawer__shipping-bar"><span class="cart-drawer__shipping-progress" style="width:' + progress + '%"></span></div></div>';
    }
    var note = drawer.dataset.showNote === 'true' ? '<label class="visually-hidden" for="CartDrawerNote">Observações do pedido</label><textarea class="cart-drawer__note field__input" id="CartDrawerNote" data-cart-note placeholder="Observações do pedido">' + escapeHtml(cart.note || '') + '</textarea>' : '';
    content.innerHTML = '<div class="cart-drawer__items">' + items + '</div><footer class="cart-drawer__footer">' + shipping +
      '<div class="cart-drawer__subtotal"><span>' + escapeHtml(text('subtotalLabel', 'Subtotal')) + '</span><strong>' + money(cart.total_price, cart.currency) + '</strong></div>' +
      '<p class="cart-drawer__tax-note">Frete e descontos calculados na finalização.</p>' + note + '<div class="cart-drawer__buttons">' +
      '<button type="button" class="button button--secondary" data-cart-drawer-close>' + escapeHtml(text('continueLabel', 'Continuar comprando')) + '</button>' +
      '<a class="button cart-drawer__checkout" href="' + root + 'checkout">' + escapeHtml(text('checkoutLabel', 'Finalizar compra')) + '</a></div></footer>';
  }

  function fetchCart() {
    setStatus(text('loadingLabel', 'Atualizando carrinho...'));
    return fetch(root + 'cart.js', { headers: { Accept: 'application/json' } }).then(function (response) {
      if (!response.ok) throw new Error('cart');
      return response.json();
    }).then(function (cart) { render(cart); setStatus(''); return cart; }).catch(function () {
      setStatus(text('errorLabel', 'Não foi possível atualizar o carrinho. Tente novamente.'));
    });
  }
  function openDrawer(trigger) {
    if (!drawer) return;
    lastTrigger = trigger || document.activeElement;
    if (lastTrigger && lastTrigger.setAttribute) lastTrigger.setAttribute('aria-expanded', 'true');
    drawer.hidden = false;
    document.body.classList.add('cart-drawer-open');
    requestAnimationFrame(function () { drawer.classList.add('is-open'); drawer.querySelector('.cart-drawer__panel').focus(); });
    fetchCart();
  }
  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.classList.remove('is-open');
    document.body.classList.remove('cart-drawer-open');
    setTimeout(function () {
      drawer.hidden = true;
      if (lastTrigger && lastTrigger.setAttribute) lastTrigger.setAttribute('aria-expanded', 'false');
      if (lastTrigger) lastTrigger.focus();
    }, 300);
  }
  function changeItem(key, quantity) {
    setStatus(text('loadingLabel', 'Atualizando carrinho...'));
    return fetch(root + 'cart/change.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ id: key, quantity: Math.max(0, quantity) }) })
      .then(function (response) { if (!response.ok) throw new Error('change'); return response.json(); })
      .then(function (cart) { render(cart); setStatus(''); })
      .catch(function () { setStatus(text('errorLabel', 'Não foi possível atualizar o carrinho. Tente novamente.')); });
  }

  document.addEventListener('click', function (event) {
    var opener = event.target.closest('.header__cart, .topbar__cart, [data-cart-drawer-open]');
    if (opener && drawer) { event.preventDefault(); openDrawer(opener); return; }
    var closer = event.target.closest('[data-cart-drawer-close]');
    if (closer && drawer && drawer.contains(closer)) { event.preventDefault(); closeDrawer(); return; }
    var action = event.target.closest('[data-cart-quantity], [data-cart-remove]');
    if (!action || !drawer || !drawer.contains(action)) return;
    var item = action.closest('[data-cart-key]');
    if (item) changeItem(item.dataset.cartKey, action.hasAttribute('data-cart-remove') ? 0 : Number(action.dataset.cartQuantity));
  });
  document.addEventListener('keydown', function (event) {
    if (!drawer || drawer.hidden) return;
    if (event.key === 'Escape') { closeDrawer(); return; }
    if (event.key !== 'Tab') return;
    var focusable = drawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.addEventListener('change', function (event) {
    if (!event.target.matches('[data-cart-note]')) return;
    fetch(root + 'cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ note: event.target.value }) })
      .then(function (response) { if (!response.ok) throw new Error('note'); return response.json(); })
      .then(function (cart) { cartCache = cart; setStatus(''); })
      .catch(function () { setStatus(text('errorLabel', 'Não foi possível atualizar o carrinho. Tente novamente.')); });
  });

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form.matches('form[action$="/cart/add"], form[data-type="add-to-cart-form"]')) return;
    event.preventDefault();
    var button = form.querySelector('[type="submit"], [name="add"]');
    if (button) button.setAttribute('aria-busy', 'true');
    fetch(root + 'cart/add.js', { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
      .then(function (response) { if (!response.ok) throw new Error('add'); return response.json(); })
      .then(function () { if (drawer) openDrawer(button); else fetchCart(); })
      .catch(function () { form.submit(); })
      .finally(function () { if (button) button.removeAttribute('aria-busy'); });
  });

  document.addEventListener('DOMContentLoaded', fetchCart);
})();
